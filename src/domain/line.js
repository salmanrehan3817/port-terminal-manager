import { PriorityQueue } from "../structures/priority_queue.js";

// Priority labels (Part 3.5)
export const PRIORITY_LABELS = {
    "-1": "Emergency",
    "0": "Critical",
    "1": "High",
    "2": "Normal",
    "3": "Low",
    "4": "Very low",
    "5": "Bulk",
};

// A docking line: capacity 8 ships (including the active ship).
// ships PriorityQueue holds WAITING ships only. currentShipId is the ACTIVE ship.
// No preemption (Part 4.3). Promotion via advance() (Part 4.4).
export class Line {
    constructor(id, capacity = 8) {
        this.id = id;
        this.capacity = capacity;
        this.ships = new PriorityQueue();   // (priority, seq, shipId)
        this.currentShipId = null;
    }

    // O(log n) — adds ship to waiting queue. Port is responsible for calling advance() if needed.
    enqueue(ship, seq) {
        this.ships.push(ship.priority, seq, ship.id);
    }

    // O(log n) — pops the next waiting ship (front of PQ). Returns shipId or undefined.
    dequeueNext() {
        const top = this.ships.pop();
        return top ? top.shipId : undefined;
    }

    // O(1) — waiting + (current ? 1 : 0)
    size() {
        return this.ships.size() + (this.currentShipId !== null ? 1 : 0);
    }

    // O(1)
    isFull() {
        return this.size() >= this.capacity;
    }

    // O(1)
    isEmpty() {
        return this.size() === 0;
    }

    // O(1) — peeks next WAITING ship (not current)
    peek() {
        return this.ships.peek();
    }

    // O(log n) — current ship departs; next waiting ship (if any) becomes active.
    // Returns the newly promoted shipId, or null if line is now empty.
    advance() {
        this.currentShipId = null;
        if (this.ships.isEmpty()) return null;
        const top = this.ships.pop();
        this.currentShipId = top.shipId;
        return top.shipId;
    }

    // O(n log n) — plain object for UI (Part 10.2 shape).
    // Uses only public PQ API (pop + re-push) to enumerate waiting ships in priority order.
    snapshot(port) {
        const result = [];

        // Active ship first
        if (this.currentShipId !== null) {
            const ship = port.ships.get(this.currentShipId);
            if (ship) result.push(this._formatShip(ship));
        }

        // Drain waiting ships to enumerate in order, then restore
        const items = [];
        while (!this.ships.isEmpty()) {
            const item = this.ships.pop();
            items.push(item);
            const ship = port.ships.get(item.shipId);
            if (ship) result.push(this._formatShip(ship));
        }
        for (const item of items) {
            this.ships.push(item.priority, item.seq, item.shipId);
        }

        return { id: this.id, ships: result };
    }

    // O(1) — internal formatter (Part 10.2 ship shape)
    _formatShip(ship) {
        return {
            id: ship.id,
            name: ship.name,
            priority: ship.priority,
            priorityLabel: PRIORITY_LABELS[String(ship.priority)] || "Unknown",
            state: ship.status,
            capacity: ship.capacity,
            used: ship.containerCount(),
            activeContainerId: ship.activeContainerId,
            progress: ship.progress,
        };
    }
}