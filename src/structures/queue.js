// Queue (FIFO).
// Used for: yard FIFO, BFS traversal in Graph.
export class Queue {
    constructor() {
        this.items = [];
        this.head = 0;
    }

    // O(1) amortized
    enqueue(item) {
        this.items.push(item);
    }

    // O(1) amortized
    dequeue() {
        if (this.head >= this.items.length) return undefined;
        const item = this.items[this.head];
        this.head++;
        return item;
    }

    // O(1)
    front() {
        return this.items[this.head];
    }

    // O(1)
    isEmpty() {
        return this.head >= this.items.length;
    }

    // O(1)
    size() {
        return this.items.length - this.head;
    }
}