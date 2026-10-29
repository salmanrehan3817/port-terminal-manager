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
        // 🚨 FIX: 1. Sab se pehle processing wali ships ko check karein
        // Agar ship "processing" ya "ready" hai, toh usay foran depart kar dein
        for (const ship of [...this.port.processingShips.values()]) {
            if (ship.status === "processing" || ship.status === "ready") {
                this.port.depart(ship.id);
            }
        }

        // 2. Agar koi ship load/unload ho rahi hai toh interrupt na karein
        for (const line of this.port.lines) {
            if (line.currentShipId === null) continue;
            const s = this.port.ships.get(line.currentShipId);
            if (s && (s.status === "loading" || s.status === "unloading")) return;
        }
        for (const s of this.port.processingShips.values()) {
            if (s.status === "loading" || s.status === "unloading") return;
        }

        // 3. Agar yard empty hai toh loading rok dein
        if (this.port.yard.size() === 0) return;

        // 4. Collect candidate ships (active + waiting in lines)
        const candidates = [];
        for (const line of this.port.lines) {
            if (line.currentShipId !== null) {
                const s = this.port.ships.get(line.currentShipId);
                if (s && !s.isFull()) candidates.push({ ship: s, line, isActive: true });
            }
            const drained = [];
            while (!line.ships.isEmpty()) {
                const item = line.ships.pop();
                drained.push(item);
                const s = this.port.ships.get(item.shipId);
                if (s && !s.isFull()) candidates.push({ ship: s, line, isActive: false });
            }
            for (const item of drained) {
                line.ships.push(item.priority, item.seq, item.shipId);
            }
        }
        if (candidates.length === 0) return;

        // 5. Sort by priority
        candidates.sort((a, b) => {
            if (a.ship.priority !== b.ship.priority) return a.ship.priority - b.ship.priority;
            if (a.ship.arrival !== b.ship.arrival) return a.ship.arrival - b.ship.arrival;
            return a.ship.id < b.ship.id ? -1 : 1;
        });

        const chosen = candidates[0];

        // 6. Preempt if chosen is waiting
        if (!chosen.isActive) this._preempt(chosen.line, chosen.ship.id);

        // 7. FIFO — get next container from yardQueue (skip stale entries)
        let nextId = null;
        while (!this.port.yardQueue.isEmpty()) {
            const front = this.port.yardQueue.front();
            if (this.port.yard.has(front)) { nextId = front; break; }
            this.port.yardQueue.dequeue();
        }
        if (!nextId) return;

        // 8. Start loading; dequeue from FIFO ONLY on success
        const ok = this.port.startLoading(chosen.ship.id, nextId);
        if (ok) {
            this.port.yardQueue.dequeue();
        } else {
            if (this.port.yardQueue.front() === nextId) this.port.yardQueue.dequeue();
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