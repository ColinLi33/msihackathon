class User{
    name = ''
    pid = ''
    currSession = -1 //start time in epoch

    constructor(name = '', pid = '', currSession = -1){
        this.name = name;
        this.pid = pid;
        this.currSession = currSession;
    }

    startSession(){
        this.currSession = Date.now();
    }
}

module.exports = User;