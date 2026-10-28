import { Stack } from "../structures/stack.js";

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
        this.history = [];   // ← Ye line zaroori hai
    }

    load(containerId) { if (this.isFull()) return false; this.containers.push(containerId); return true; }
    unload() { return this.containers.pop(); }
    peekTop() { return this.containers.peek(); }
    isFull() { return this.containers.size() >= this.capacity; }
    isEmpty() { return this.containers.isEmpty(); }
    containerCount() { return this.containers.size(); }
    listContainers() { return this.containers.toArray(); }
}