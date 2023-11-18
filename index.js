const express = require('express');
const PC = require('./pc');
const User = require('./user')
const fs = require("fs");
const { parse } = require("csv-parse");

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Welcome to my server!');
});

app.get('/signin', (req, res) => {
    res.send('Welcome to my server!');
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