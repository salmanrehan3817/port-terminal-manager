import { Port } from "./port.js";
import { EventBus } from "./event_bus.js";

const TICK_INTERVAL_MS = 100;               // Part 6.1
const SPEED_OPTIONS = new Set([0.5, 1, 2, 4]);

export class Engine {
    constructor(tickMs = TICK_INTERVAL_MS) {
        this.bus = new EventBus();
        this.port = new Port(this.bus);
        this.tickMs = tickMs;
        this.speed = 1;
        this.running = false;
        this.timer = null;
    }

    // O(1) — starts the sim clock (setInterval allowed here only, Part 8.4)
    start() {
        if (this.running) return;
        this.running = true;
        this.timer = setInterval(() => this.tick(), this.tickMs);
    }

    // O(1)
    stop() {
        if (!this.running) return;
        this.running = false;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    // O(1) — accepts {0.5, 1, 2, 4} (Part 6.4)
    setSpeed(multiplier) {
        if (!SPEED_OPTIONS.has(multiplier)) return false;
        this.speed = multiplier;
        return true;
    }

    // O(n) — advance simTime, then update active loading/unloading progress
    tick() {
        this.port.simTime += this.tickMs * this.speed;
        this.port.updateProgress();
        this.bus.emit("engine:tick", { simTime: this.port.simTime });
    }

    getSnapshot() { return this.port.snapshot(); }

    // Action methods — delegate to Port (which emits events via shared bus)
    addShip(shipId, name, arrival, priority = 2, capacity = 10) {
        return this.port.addShip(shipId, name, arrival, priority, capacity);
    }
    addContainer(containerId, weight, dest) {
        return this.port.addContainer(containerId, weight, dest);
    }
    addRoute(fromDest, toDest) { return this.port.addRoute(fromDest, toDest); }
    shipArrives(shipId) { return this.port.shipArrives(shipId); }
    startLoading(shipId, containerId) { return this.port.startLoading(shipId, containerId); }
    startUnloading(shipId) { return this.port.startUnloading(shipId); }
    depart(shipId) { return this.port.depart(shipId); }
    undoUnload() { return this.port.undoUnload(); }

    // Query methods
    reachableDestinations(start) { return this.port.reachableDestinations(start); }
    searchContainersByPrefix(prefix) { return this.port.searchContainersByPrefix(prefix); }
    searchShipsByPrefix(prefix) { return this.port.searchShipsByPrefix(prefix); }
    shipsSortedByArrival() { return this.port.shipsSortedByArrival(); }
    shipsInArrivalRange(t1, t2) { return this.port.shipsInArrivalRange(t1, t2); }
    uniqueDestinations() { return this.port.uniqueDestinations(); }
}