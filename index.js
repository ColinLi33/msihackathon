const express = require('express');
const User = require('./user')
const fs = require("fs");
const { parse } = require("csv-parse");
const Queue = require("./pcQ")
const MongoDriver = require('./mongoDriver');
const script = require('./script.js');
 

const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


const port = 3000;
const pcQueue = new Queue();
const mongo = new MongoDriver("mongodb+srv://testUser:123@cluster0.vumv6ea.mongodb.net/?retryWrites=true&w=majority");

app.get('/', (req, res) => {
  res.render('index');
});
app.get('/swipe', (req, res) => {
    res.render('swipe');
});

app.post('/auth', async function(req, res) {
	let name = req.body.name;
	let pid = req.body.pid;
	if (name && pid) {
        const newUser = new User(name, pid, Date.now())
        availPC = await getAvailablePC();
        console.log(availPC)
        if(availPC != null){ //there is available pc
            await assignUserToPc(newUser, availPC)
            res.render('gotopc', {availPC});
            
        } else {  //no available pc
            pcQueue.enqueue(newUser);
            spotInLine = pcQueue.size();
            res.render('queue', {spotInLine})
        }
        
	} else {
		res.send('Please enter Name and PID!');
		res.end();
	}
});

async function assignUserToPc(user, pc){
    pcQuery = {name: pc}
    userQuery = {pid: user.pid}
    pcUpdate = {currUser: user}
    userUpdate = {name: user.name, pid: user.pid, currSession: user.currSession}
    script.changeStatus(pc, "used");
    await mongo.update('pcList', pcQuery, pcUpdate)
    await mongo.update('userList', userQuery, userUpdate)
}

function isAvailable(pc){
    if(pc.currUser == null && pc.status == 'GOOD'){
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

app.listen(port, () => {
    startMongo();
    console.log(`Server is running on port ${port}`);
}); 

async function startMongo(){
    await mongo.connect();
    /* initialize colors here*/
    // console.log(pcList)
}