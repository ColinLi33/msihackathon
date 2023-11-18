const express = require('express');
const PC = require('./pc');
const User = require('./user')
const fs = require("fs");
const { parse } = require("csv-parse");
const Queue = require("./pcQ")


const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const port = 3000;

let pcList = []
const pcQueue = new Queue();

app.get('/', (req, res) => {
  res.send('Welcome to my server!');
});

app.get('/swipe', (req, res) => {
    res.render('swipe');
});

app.post('/auth', function(req, res) {
	// Capture the input fields
	let name = req.body.name;
	let pid = req.body.pid;
    console.log(name,pid)
	// Ensure the input fields exists and are not empty
	if (name && pid) {
        const newUser = new User(name,pid, Date.now())
        availPC = getAvailablePC();
        console.log(availPC)
        if(availPC != null){ //there is available pc
            assignUserToPc(newUser, availPC)
            let pcName = availPC.getName();
            res.render('gotopc', {pcName});
            
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

function assignUserToPc(user, pc){
    pc.setUser(user);
    user.startSession();
}

//return available pc or null if no pc available
function getAvailablePC(){
    for(let i = 0; i < pcList.length; i++){
        if(pcList[i].isAvailable()){
            return pcList[i];
        }
    }
    return null;
}

function readPCs(){
    fs.createReadStream("./pcData.csv")
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", function (row) {
        currUser = null;
        if(row[1] != 'null'){
            currUser = row[1]
        }
        const newPC = new PC(row[0], currUser, row[2])
        pcList.push(newPC)
    })
    .on("end", function () {
      //  console.log("finished");
    })
    .on("error", function (error) {
        console.log(error.message);
    });
}

app.listen(port, () => {
    readPCs()
    console.log(`Server is running on port ${port}`);
}); 