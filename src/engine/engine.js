import { Port } from "./port.js";
import { EventBus } from "./event_bus.js";

const TICK_INTERVAL_MS = 100;
const SPEED_OPTIONS = new Set([0.5, 1, 2, 4]);

export class Engine {
    constructor(tickMs = TICK_INTERVAL_MS) {
        this.bus = new EventBus();
        this.port = new Port(this.bus);
        this.tickMs = tickMs;
        this.speed = 1;
        this.running = false;
        this.timer = null;
        this.autoDrive = true;
        this._shipPhase = new Map();
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.timer = setInterval(() => this.tick(), this.tickMs);
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
    }

    setSpeed(multiplier) {
        if (!SPEED_OPTIONS.has(multiplier)) return false;
        this.speed = multiplier;
        return true;
    }

    setAutoDrive(enabled) {
        this.autoDrive = !!enabled;
        return this.autoDrive;
    }

    tick() {
        try {
            this.port.simTime += this.tickMs * this.speed;
            this.port.updateProgress();
            if (this.autoDrive) this._autoLoadNext();
            this.bus.emit("engine:tick", { simTime: this.port.simTime });
        } catch (err) {
            console.error("Simulation tick error:", err);
        }
    }

    _autoLoadNext() {
        // 1. Auto-Depart: Remove ships from processing if they are done loading/unloading
        for (const ship of [...this.port.processingShips.values()]) {
            if (ship.status === "ready" || ship.status === "processing") {
                this.port.depart(ship.id);
            }
        }

        // 2. Promote: Pick highest priority waiting ship and make it docked if line is empty
        for (const line of this.port.lines) {
            if (line.currentShipId === null && !line.ships.isEmpty()) {
                const top = line.ships.pop();
                const ship = this.port.ships.get(top.shipId);
                line.currentShipId = ship.id;
                ship.status = "docked";
                this.port._pushShipHistory(ship, "docked", `line ${line.id} (priority promoted)`);
                this.port._emit("ship:docked", { shipId: ship.id, lineId: line.id });
                this.port._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this.port) });
            }
        }

        // 3. Process: Start loading docked ships based on global priority
        let bestDocked = null;
        for (const line of this.port.lines) {
            if (line.currentShipId !== null) {
                const ship = this.port.ships.get(line.currentShipId);
                if (ship && ship.status === "docked") {
                    if (!bestDocked || ship.priority < bestDocked.priority) {
                        bestDocked = ship;
                    }
                }
            }
        }

        if (bestDocked) {
            const yard = this.port.yard.values();
            if (yard.length > 0) {
                if (bestDocked.status === "docked") {
                    this.port.startLoading(bestDocked.id, yard[0].id);
                }
            }
        }
    }

    _preempt(line, targetShipId) {
        const prevActiveId = line.currentShipId;
        if (prevActiveId === targetShipId) return;

        const drainItems = [];
        let found = false;
        while (!line.ships.isEmpty()) {
            const item = line.ships.pop();
            if (!found && item.shipId === targetShipId) {
                found = true;
            } else {
                drainItems.push(item);
            }
        }
        for (const it of drainItems) {
            line.ships.push(it.priority, it.seq, it.shipId);
        }

        if (prevActiveId) {
            const prev = this.port.ships.get(prevActiveId);
            if (prev) {
                const newSeq = this.port.seq++;
                line.ships.push(prev.priority, newSeq, prevActiveId);
                prev.status = "waiting";
            }
        }

        line.currentShipId = targetShipId;
        const target = this.port.ships.get(targetShipId);
        if (target) target.status = "docked";
    }

    getSnapshot() { return this.port.snapshot(); }

    addShip(shipId, name, arrival, priority = 2, capacity = 10, originPort = "N/A", destinationPort = "N/A") {
        return this.port.addShip(shipId, name, arrival, priority, capacity, originPort, destinationPort);
    }
    addContainer(containerId, weight, dest) {
        return this.port.addContainer(containerId, weight, dest);
    }
    addRoute(fromDest, toDest) { return this.port.addRoute(fromDest, toDest); }
    shipArrives(shipId) { return this.port.shipArrives(shipId); }
    shipArrivesOnLine(shipId, lineId) { return this.port.shipArrivesOnLine(shipId, lineId); }
    startLoading(shipId, containerId) { return this.port.startLoading(shipId, containerId); }
    startUnloading(shipId) { return this.port.startUnloading(shipId); }
    depart(shipId) { return this.port.depart(shipId); }
    undoUnload() { return this.port.undoUnload(); }

    reachableDestinations(start) { return this.port.reachableDestinations(start); }
    searchContainersByPrefix(prefix) { return this.port.searchContainersByPrefix(prefix); }
    searchShipsByPrefix(prefix) { return this.port.searchShipsByPrefix(prefix); }
    shipsSortedByArrival() { return this.port.shipsSortedByArrival(); }
    shipsInArrivalRange(t1, t2) { return this.port.shipsInArrivalRange(t1, t2); }
    uniqueDestinations() { return this.port.uniqueDestinations(); }
}