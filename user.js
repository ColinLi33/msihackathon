class User{
    name = ''
    id = ''
    currSession = -1

    constructor(name = '', id = '', currSession = -1){
        this.name = name;
        this.id = id;
        this.currSession = currSession;
    }
}

module.exports = User;