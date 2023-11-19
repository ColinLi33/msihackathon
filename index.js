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
app.get('/', (req, res) => {
  res.render('index');
});
app.get('/swipe', (req, res) => {
    res.render('swipe');
});

app.get('/admin', (req, res) => {
    res.render('adminLogin');
});

app.get('/login', (req, res) =>{
    if (req.query.username === "UCSDEsports" && req.query.password === "tec123"){
        res.render('admin');
    }else{
        res.render('adminLogin');
    }
});


//test function that resets all PC to empty
app.get('/test', async (req, res) => {
    if(mongoStarted){
        pcList = await mongo.read("pcList")
        for(let i = 0; i < pcList.length; i++){
            pcQuery = {name: pcList[i].name}
            pcUpdate = {currUser: null, status: "Available"}
            await mongo.update('pcList', pcQuery, pcUpdate)
        }
        sendUpdate();
    }
});
//TODO: make it so if you already using PC it wont give you another one
app.post('/auth', async function(req, res) {
	let name = req.body.name;
	let pid = req.body.pid;
	if (name && pid) {
        user = await getSingleUserInfo(pid)
        if(user.length !=0 && user.currSession!=-1){
            res.send('You already have a PC');
            res.end();
        }
        if(user.length == 0){
            user = {
                name: name,
                pid: pid,
                currSession: -1,
                totalHours: 0
            }
            await mongo.write('userList', user)
        }
        availPC = await getAvailablePC();
        if(availPC != null){ //there is available pc
            await assignUserToPc(user, availPC)
            res.render('gotopc', {availPC});
        } else {  //no available pc
            const qQuery = { pid: user.pid };
            const qInfo = await mongo.read('userQueue', qQuery);
            if(qInfo.length == 0){ //add user to queue
                user['index'] = await mongo.getSize('userQueue') + 1
                await mongo.write('userQueue', user)
                spotInLine = user.index
                res.render('queue', {spotInLine})
            } else { //user already in queue
                spotInLine = qInfo[0].index
                res.render('alreadyQueued', {spotInLine})
            }
        }
        
	} else {
		res.send('Please enter Name and PID!');
		res.end();
	}
});

async function assignUserToPc(user, pc){
    user.currSession = Date.now()
    pcQuery = {name: pc}
    userQuery = {pid: user.pid}
    pcUpdate = {currUser: user, status: "Used"}
    userUpdate = {name: user.name, pid: user.pid, currSession: Date.now(), totalHours: user.totalHours}
    await mongo.update('pcList', pcQuery, pcUpdate)
    await mongo.update('userList', userQuery, userUpdate)
    sendUpdate();

}

async function checkQueue(){
    queueInfo = await mongo.read('userQueue')
    if(queueInfo.length > 0){
        io.emit('queueUpdate', {queueInfo: queueInfo})
    }
}

async function endSession(pc){
    pc = pc[0];
    pcQuery = {name: pc.name}
    pcUpdate = {currUser: null, status: "Available"}
    user = pc.currUser;
    userQuery = {pid: user.pid}
    newTotalHours = parseFloat((user.totalHours + ((Date.now() - user.currSession) / 3600000)).toFixed(2))
    userUpdate = {currSession: -1, totalHours: newTotalHours}
    await mongo.update('pcList', pcQuery, pcUpdate)
    await mongo.update('userList', userQuery, userUpdate)
    sendUpdate();
    checkQueue();
}

async function sendUpdate(){
    pcList = await mongo.read("pcList")
    io.emit('pcStatusUpdate', {pcList: pcList});
}

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

async function getSinglePcInfo(pcName) {
    const pcQuery = { name: pcName };
    const pcInfo = await mongo.read('pcList', pcQuery);
    return pcInfo;
}

async function getSingleUserInfo(pid) {
    const userQuery = { pid: pid };
    const userInfo = await mongo.read('userList', userQuery);
    return userInfo;
}


http.listen(port, () => {
    startMongo();
    console.log(`Server is running on port ${port}`);
}); 

io.on('connection', (socket) => {
    if(mongoStarted){
        sendUpdate();
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

    socket.on('queueAccepted', async(data) => {
        if(mongoStarted){
            data = data.nextInLine
            freePc = await getAvailablePC();
            await assignUserToPc(data, freePc);
            const userQuery = { pid: data.pid };
            await mongo.delete('userQueue', userQuery);
        }
    });
});

async function startMongo(){
    await mongo.connect();
    mongoStarted = true;
}