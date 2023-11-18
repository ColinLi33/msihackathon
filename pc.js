class PC{
    name = '';
    currUser = null
    status = null;

    constructor(name='', currUser = null, status = null){
        this.name = name;
        this.currUser = currUser;
        this.status = status;
    }

    isAvailable(){
        if(this.currUser == null && this.status == "GOOD"){
            return true;
        }
        return false;
    }

    setUser(user){
        this.currUser = user;
    }

    getName(){
        return this.name;
    }
}

module.exports = PC;