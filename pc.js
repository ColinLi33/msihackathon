class PC{
    name = '';
    currUser = null
    status = null;

    constructor(name='', currUser = null, status = null){
        this.name = name;
        this.currUser = currUser;
        this.status = status;
    }
}

module.exports = PC;