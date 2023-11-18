class User{
    name = ''
    id = ''
    currSession = -1 //start time in epoch

    constructor(name = '', id = '', currSession = -1){
        this.name = name;
        this.id = id;
        this.currSession = currSession;
    }

    startSession(){
        this.currSession = Date.now();
    }
}

module.exports = User;