class Queue {
    constructor() {
        this.items = {};
        this.front = 0;
        this.rear = 0;
    }
    enqueue(item) {
        this.items[this.rear] = item;
        this.rear++;
    }
    dequeue() {
        const item = this.items[this.front];
        delete this.items[this.front];
        this.front++;
        return item;
    }
    peek() {
        return this.items[this.front];
    }
    size() {
        return this.rear - this.front;
    }
    isEmpty() {
        return this.rear == 0;
    }
}
module.exports = Queue;