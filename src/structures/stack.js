// Stack (LIFO).
// Used for: ship cargo hold, unload history, docking history.
export class Stack {
    constructor() {
        this.items = [];
    }

    // O(1)
    push(item) {
        this.items.push(item);
    }

    // O(1)
    pop() {
        return this.items.pop();
    }

    // O(1)
    peek() {
        return this.items[this.items.length - 1];
    }

    // O(1)
    isEmpty() {
        return this.items.length === 0;
    }

    // O(1)
    size() {
        return this.items.length;
    }

    // O(n) — bottom to top (for listContainers)
    toArray() {
        return [...this.items];
    }
}