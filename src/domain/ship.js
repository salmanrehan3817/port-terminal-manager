import { Stack } from "../structures/Stack.js";

// Ship entity. Cargo is a Stack (LIFO — top container unloads first).
// States (Part 3.2): atSea, waiting, docked, loading, unloading, ready, departing, departed.
export class Ship {
    constructor(id, name, arrival, priority = 2, capacity = 10) {
        this.id = id;
        this.name = name;
        this.arrival = arrival;
        this.priority = priority;
        this.capacity = capacity;
        this.containers = new Stack();
        this.status = "atSea";
        this.currentLineId = null;
        this.activeContainerId = null;
        this.progress = 0;
        this.operationStartedAt = null;
    }

    // O(1)
    load(containerId) {
        if (this.isFull()) return false;
        this.containers.push(containerId);
        return true;
    }

    // O(1)
    unload() {
        return this.containers.pop();
    }

    // O(1)
    peekTop() {
        return this.containers.peek();
    }

    // O(1)
    isFull() {
        return this.containers.size() >= this.capacity;
    }

    // O(1)
    isEmpty() {
        return this.containers.isEmpty();
    }

    // O(1)
    containerCount() {
        return this.containers.size();
    }

    // O(n)
    listContainers() {
        return this.containers.toArray();
    }
}