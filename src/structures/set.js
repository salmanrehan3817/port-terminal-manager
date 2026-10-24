import { HashMap } from "./hash_map.js";

// Set backed by HashMap (values are `true`; only keys matter).
// Used for: unique destinations tracking, BFS visited tracking in Graph.
export class Set {
    constructor() {
        this.map = new HashMap();
    }

    // O(1) average
    add(item) {
        this.map.put(item, true);
    }

    // O(1) average
    has(item) {
        return this.map.has(item);
    }

    // O(1) average
    delete(item) {
        return this.map.delete(item);
    }

    // O(1)
    size() {
        return this.map.size();
    }

    // O(n) — array of items
    values() {
        return this.map.keys();
    }
}