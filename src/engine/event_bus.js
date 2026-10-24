// Tiny event bus shared by Engine and UI (Part 10.1).
export class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    // O(1)
    on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, []);
        this.listeners.get(event).push(callback);
    }

    // O(n) — n = listeners for this event
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const arr = this.listeners.get(event);
        const i = arr.indexOf(callback);
        if (i !== -1) arr.splice(i, 1);
    }

    // O(n)
    emit(event, payload) {
        if (!this.listeners.has(event)) return;
        for (const cb of this.listeners.get(event)) cb(payload);
    }
}