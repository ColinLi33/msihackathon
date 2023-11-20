const express = require('express');
const fs = require("fs");
const { parse } = require("csv-parse");
const MongoDriver = require('./mongoDriver');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const port = 3000;
const mongo = new MongoDriver("mongodb+srv://testUser:123@cluster0.vumv6ea.mongodb.net/?retryWrites=true&w=majority");
let mongoStarted = false

//home page
app.get('/', (req, res) => {
  res.render('index');
});

//card swipe page
app.get('/swipe', (req, res) => {
    res.render('swipe');
});

//admin page
app.get('/admin', (req, res) => {
    res.render('adminLogin');
});

//setup page
app.get('/setup', (req, res) => {
    res.render('setup');
});

app.get('/pcPick', (req, res) => {
    res.render('pcPick');
});

//admin login page
app.get('/login', (req, res) =>{
    if (req.query.username === "UCSDEsports" && req.query.password === "tec123"){
        res.render('admin');
    }else{
        res.render('adminLogin');
    }
});

//admin page
app.get('/manager', (req, res) => {
    res.render('managerLogin');
});

//manager
app.get('/managerLogin', (req, res) =>{
    if (req.query.username === "UCSDEsports" && req.query.password === "tec123"){
        res.render('manager');
    }else{
        res.render('managerLogin');
    }
});

//gotoPC
app.get('/gotopc/:pcName', (req, res) => {
    const availPC = req.params.pcName;
    res.render('gotopc', {availPC})
});

app.get('/pcPicker/:pid', (req, res) => {
    const pid = req.params.pid;
    res.render('pcPicker', {pid})
});


//test function that resets all PC to empty
app.get('/test', async (req, res) => {
    if(mongoStarted){
        pcList = await mongo.read("pcList")
        for(let i = 0; i < pcList.length; i++){
            endSession(pcList[i]);
        }
        sendUpdate();
    }
});

//function that happens after swipe, does logic to see if queue needed or can directly go to pc
app.post('/auth', async function(req, res) {
	let name = req.body.name;
	let pid = req.body.pid;
	if (name && pid) {
        //get user data from swipe
        user = await getSingleUserInfo(pid)
        if(user.length == 0){ //make new user if not in DB
            user = {
                name: name,
                pid: pid,
                currSession: -1,
                totalHours: 0
            }
            await mongo.write('userList', user)
        }
        if(user.length == 1){
            user = user[0]
        }
        //comment this for testingif wnat to fill up pcs
        if(user.currSession != -1){
            res.render('alreadyHavePC');
            return;
        }
        availPC = await getAvailablePC();
        console.log("HELLO", availPC)
        if(availPC != null){ //there is available pc
            res.render('pcPick', {user: user, availPC: availPC})
            return
            // return;
        } else {  //no available pc
            const qQuery = { pid: user.pid };
            const qInfo = await mongo.read('userQueue', qQuery);
            if(qInfo.length == 0){ //add user to queue
                user['index'] = await mongo.getSize('userQueue') + 1
                user.currSession = Date.now();
                await mongo.write('userQueue', user)
                spotInLine = user.index
                res.render('queue', {spotInLine})
                sendQueueUpdate()
                return;
            } else { //user already in queue
                spotInLine = qInfo[0].index
                res.render('alreadyQueued', {spotInLine})
                return;
            }
        }
	} else {
		res.send('Please enter Name and PID!');
		res.end();
	}
});

//add user to PC
async function assignUserToPc(user, pc){
    user.currSession = Date.now()
    pcQuery = {name: pc}
    userQuery = {pid: user.pid}
    pcUpdate = {currUser: user, status: "Used"}
    userUpdate = {name: user.name, pid: user.pid, currSession: Date.now(), totalHours: user.totalHours}
    await mongo.update('pcList', pcQuery, pcUpdate) //update pc DB
    await mongo.update('userList', userQuery, userUpdate) //update user DB
    sendUpdate();

}

//TODO ask chris what to do if someone declines queue
//if there are people in queue
async function checkQueue(){
    queueInfo = await mongo.read('userQueue')
    if(queueInfo.length > 0){
        io.emit('queueFillPC', {queueInfo: queueInfo})
    }
}

//remove someone from PC
async function endSession(pc){
    if(pc.length == 1){
        pc = pc[0];
    }
    if(pc.currUser != null){
        user = pc.currUser;
        pcQuery = {name: pc.name}
        pcUpdate = {currUser: null, status: "Available"}
        userQuery = {pid: user.pid}
        newTotalHours = parseFloat((user.totalHours + ((Date.now() - user.currSession) / 3600000)).toFixed(2))
        userUpdate = {currSession: -1, totalHours: newTotalHours}
        await mongo.update('pcList', pcQuery, pcUpdate)
        await mongo.update('userList', userQuery, userUpdate)
        sendUpdate();
        checkQueue();
    }
}


async function disablePC(pc){
    pc = pc[0];
    pcQuery = {name: pc.name};
    pcUpdate = {currUser: null, status: "OutOfOrder"};
    await mongo.update('pcList', pcQuery, pcUpdate);
    user = pc.currUser;
    if (user != null){
        userQuery = {pid: user.pid};
        newTotalHours = parseFloat((user.totalHours + ((Date.now() - user.currSession) / 3600000)).toFixed(2));
        userUpdate = {currSession: -1, totalHours: newTotalHours};
        await mongo.update('userList', userQuery, userUpdate)
    }
    sendUpdate();
}

async function enablePC(pc){
    pc = pc[0];
    pcQuery = {name: pc.name};
    let pcInfo = await getSinglePcInfo(pc.name);
    if (pcInfo[0].status == "OutOfOrder"){
        pcUpdate = {currUser: null, status: "Available"};
        await mongo.update('pcList', pcQuery, pcUpdate);
        sendUpdate();
    }
}

//update the PC's on the frontend
async function sendUpdate(){
    pcList = await mongo.read("pcList")
    io.emit('pcStatusUpdate', {pcList: pcList});
}

async function sendQueueUpdate(){
    queueList = await mongo.read("userQueue")
    io.emit('queueUpdated', {queueList: queueList})
}

async function sendSessionUpdate(){
    sessionList = await mongo.read("pcList");
    let result = [];
    for (let i = 0; i < sessionList.length; i++){
        if (sessionList[i].currUser != null ){
            let sessionTime = ((Date.now() - sessionList[i].currUser.currSession) / 60000).toFixed(0);
            let session = {userData: sessionList[i].currUser, time : sessionTime, pcName: sessionList[i].name};
            result.push(session);
        }
    }
    return result;
}

async function checkIfReserved(){
    let reservedList = await mongo.read("reservations");
    let now = new Date();
    for(let i = 0; i < reservedList.length; i++){
        if (reservedList[i].timestamp - now <= 3600000){
            for (let j = 0; j < reservedList[i].pcList.length; j++){
                pcQuery = {name: reservedList[i].pcList[j]};
                pcUpdate = {status: "Reserved"};
                await mongo.update('pcList', pcQuery, pcUpdate);
                sendUpdate();
            }
        }
    }
}
setInterval(checkIfReserved, 90000);


//return true if pc is open
function isAvailable(pc){
    if(pc.currUser == null && pc.status == 'Available'){
        return true;
    }
    return false;
}


//return available pc or null if no pc available
async function getAvailablePC(){
    //check mongo
    pcList = await mongo.read("pcList")
    for(let i = 0; i < pcList.length; i++){
        if(isAvailable(pcList[i])){
            return pcList[i].name;
        }
    }
    return null;
}

//get all info for single PC in DB
async function getSinglePcInfo(pcName) {
    const pcQuery = { name: pcName };
    const pcInfo = await mongo.read('pcList', pcQuery);
    return pcInfo;
}

//get all info for single user in DB
async function getSingleUserInfo(pid) {
    const userQuery = { pid: pid };
    const userInfo = await mongo.read('userList', userQuery);
    return userInfo;
}

//start server
http.listen(port, () => {
    startMongo();
    console.log(`Server is running on port ${port}`);
}); 

//socket logic
io.on('connection', (socket) => {
    if(mongoStarted){
        sendUpdate();
        sendQueueUpdate();
    }
    socket.on('disconnect', () => {
    });

    socket.on('getPcInfo', async (data) => {
        if(mongoStarted){
            const pcName = data.pcName;
            const pcInfo = await getSinglePcInfo(pcName);
            socket.emit('pcInfo', pcInfo);
        }
    });

    socket.on('signOff', async (data) => {
        if(mongoStarted){
            const pcInfo = await getSinglePcInfo(data.pcName);
            endSession(pcInfo);
        }
    });

    socket.on('enable', async (data)=>{
        if(mongoStarted){
            const pcInfo = await getSinglePcInfo(data.pcName);
            enablePC(pcInfo);
        }
    });

    socket.on('disable', async (data)=>{
        if(mongoStarted){
            const pcInfo = await getSinglePcInfo(data.pcName);
            disablePC(pcInfo);
        }
    });

    socket.on('queueAccepted', async(data) => {
        if(mongoStarted){
            data = data.nextInLine
            freePc = await getAvailablePC();
            await assignUserToPc(data, freePc);
            const userQuery = { pid: data.pid };
            await mongo.delete('userQueue', userQuery);
            sendQueueUpdate()
        }
    });

    socket.on('queueDeclined', async(data) => {
        if(mongoStarted){
            let minQueueBeforeKick = 45
            data = data.nextInLine
            const userQuery = { pid: data.pid };
            queueData = await mongo.read('userQueue', userQuery);
            if((Date.now() - queueData[0].currSession) / 60000 > minQueueBeforeKick){ //remove from queue if in for 45 min and decline
                await mongo.delete('userQueue', userQuery);
                sendQueueUpdate()
            }
        }
    });

    socket.on('removeFromQueue', async(data) => {
        if(mongoStarted){
            data = data.user
            const userQuery = { pid: data };
            await mongo.delete('userQueue', userQuery);
            sendQueueUpdate()
        }
    });

    socket.on('randomPC', async(data) => {
        if(mongoStarted){
            availPC = data.availPC
            pcName = availPC.replace(/["']/g, "")
            socket.emit('changePage', `/gotopc/${pcName}`);
            await assignUserToPc(data.user, pcName)
        }
    });

    socket.on('pickPC', async(data) => {
        if(mongoStarted){
            socket.emit('changePage', `/pcPicker/${data.userData.pid}`);
        }
    });
    socket.on('assignPC', async(data) => {
        if(mongoStarted){
            assignUserToPc(data.userData, data.pcName)
            socket.emit('changePage', `/gotopc/${data.pcName}`);
        }
    });
    socket.on('getCurrSession', async(data) =>{
        if(mongoStarted){
            let result = await sendSessionUpdate();
            socket.emit('currentSessions', {result});
        }
    })

    socket.on('reservedPC', async(data) =>{
        if(mongoStarted){
            timestamp = data.timestamp
            pcList = data.pcList;
            reservation = {
                timestamp: timestamp,
                pcList: pcList
            }
            await mongo.write('reservations', reservation);
        }
    })
});

//connect to mongo
async function startMongo(){
    await mongo.connect();
    mongoStarted = true;
}