const express = require('express');
const PC = require('./pc');
const User = require('./user')
const fs = require("fs");
const { parse } = require("csv-parse");


const app = express();
app.use(express.static('public'));

const port = 3000;



app.get('/', (req, res) => {
  res.send('Welcome to my server!');
});

app.get('/swipe', (req, res) => {
    res.sendFile(__dirname + '/public/swipe.html');
});

app.post('/auth', function(request, response) {
	let name = request.body.name;
	let pid = request.body.pid;
	// Ensure the input fields exists and are not empty
	if (name && pid) {
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

function readPCs(){
    fs.createReadStream("./pcData.csv")
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", function (row) {
        console.log(row);
    })
    .on("end", function () {
        console.log("finished");
    })
    .on("error", function (error) {
        console.log(error.message);
    });
}

app.listen(port, () => {
    readPCs()
    console.log(`Server is running on port ${port}`);
}); 