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
        this._shipPhase = new Map(); // shipId → "loading" | "unloading"
    }

    // O(1)
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

    // O(1)
    setSpeed(multiplier) {
        if (!SPEED_OPTIONS.has(multiplier)) return false;
        this.speed = multiplier;
        return true;
    }

    // O(1)
    setAutoDrive(enabled) {
        this.autoDrive = !!enabled;
        return this.autoDrive;
    }

    // O(n) — advance sim + update progress + auto-drive
    tick() {
        this.port.simTime += this.tickMs * this.speed;
        this.port.updateProgress();
        if (this.autoDrive) this._autoLoadNext();
        this.bus.emit("engine:tick", { simTime: this.port.simTime });
    }

    // O(lines × queue) — GLOBAL priority processing across all lines.
    // Picks the highest-priority ship among ALL ships (active + waiting).
    // If the winner is waiting, preempts its line (swaps with current active).
    // This is a DEVIATION from Part 4.3 (no-preemption) — done to fulfill
    // the "priority-based" requirement requested by the user.
    _autoLoadNext() {
        // 1. Never interrupt a load/unload in progress
        for (const line of this.port.lines) {
            if (line.currentShipId === null) continue;
            const s = this.port.ships.get(line.currentShipId);
            if (s && (s.status === "loading" || s.status === "unloading")) {
                return;
            }
        }

        // 2. Collect ALL idle ships (active + waiting) across all lines
        const candidates = [];
        for (const line of this.port.lines) {
            if (line.currentShipId !== null) {
                const s = this.port.ships.get(line.currentShipId);
                if (s && s.status !== "departed") {
                    candidates.push({ ship: s, line, isActive: true });
                }
            }
            // Peek waiting ships without consuming
            const drained = [];
            while (!line.ships.isEmpty()) {
                const item = line.ships.pop();
                drained.push(item);
                const s = this.port.ships.get(item.shipId);
                if (s && s.status !== "departed") {
                    candidates.push({ ship: s, line, isActive: false });
                }
            }
            for (const item of drained) {
                line.ships.push(item.priority, item.seq, item.shipId);
            }
        }
        if (candidates.length === 0) return;

        // 3. Global priority sort (lower priority number = more urgent)
        candidates.sort((a, b) => {
            if (a.ship.priority !== b.ship.priority) return a.ship.priority - b.ship.priority;
            if (a.ship.arrival !== b.ship.arrival) return a.ship.arrival - b.ship.arrival;
            return a.ship.id < b.ship.id ? -1 : 1;
        });

        // 4. Pick highest priority
        const { ship, line, isActive } = candidates[0];

        // 5. If winning ship is waiting, preempt its line
        if (!isActive) this._preempt(line, ship.id);

        // 6. Process one phase-step for this ship
        let phase = this._shipPhase.get(ship.id);
        if (!phase) {
            phase = "loading";
            this._shipPhase.set(ship.id, phase);
        }

        if (phase === "loading") {
            const yard = this.port.yard.values();
            if (!ship.isFull() && yard.length > 0) {
                this.port.startLoading(ship.id, yard[0].id);
            } else {
                this._shipPhase.set(ship.id, "unloading");
            }
        } else {
            if (!ship.isEmpty()) {
                this.port.startUnloading(ship.id);
            } else {
                this.port.depart(ship.id);
                this._shipPhase.delete(ship.id);
            }
        }
    }

    // O(queue) — Swap a waiting ship with the line's current active ship.
    // The previous active goes back to waiting with a fresh seq (fair FIFO).
    _preempt(line, targetShipId) {
        const prevActiveId = line.currentShipId;
        if (prevActiveId === targetShipId) return;

        // Remove target from waiting queue
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
        // Restore remaining waiting ships
        for (const it of drainItems) {
            line.ships.push(it.priority, it.seq, it.shipId);
        }

        // Demote previous active → waiting (fresh seq keeps it fair)
        if (prevActiveId) {
            const prev = this.port.ships.get(prevActiveId);
            if (prev) {
                const newSeq = this.port.seq++;
                line.ships.push(prev.priority, newSeq, prevActiveId);
                prev.status = "waiting";
            }
        }

        // Promote target → active
        line.currentShipId = targetShipId;
        const target = this.port.ships.get(targetShipId);
        if (target) target.status = "docked";
    }

    getSnapshot() { return this.port.snapshot(); }

    // Action methods
    addShip(shipId, name, arrival, priority = 2, capacity = 10) {
        return this.port.addShip(shipId, name, arrival, priority, capacity);
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

    // Query methods
    reachableDestinations(start) { return this.port.reachableDestinations(start); }
    searchContainersByPrefix(prefix) { return this.port.searchContainersByPrefix(prefix); }
    searchShipsByPrefix(prefix) { return this.port.searchShipsByPrefix(prefix); }
    shipsSortedByArrival() { return this.port.shipsSortedByArrival(); }
    shipsInArrivalRange(t1, t2) { return this.port.shipsInArrivalRange(t1, t2); }
    uniqueDestinations() { return this.port.uniqueDestinations(); }
}