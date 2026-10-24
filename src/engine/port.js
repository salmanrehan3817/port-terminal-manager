import { HashMap } from "../structures/hash_map.js";
import { Queue } from "../structures/queue.js";
import { PriorityQueue } from "../structures/priority_queue.js";
import { Stack } from "../structures/stack.js";
import { MinHeap } from "../structures/min_heap.js";
import { BST } from "../structures/bineary_search_tree.js";
import { Graph } from "../structures/graph.js";
import { Trie } from "../structures/trie.js";
import { Set } from "../structures/set.js";
import { Line, PRIORITY_LABELS } from "../domain/line.js";
import { Ship } from "../domain/ship.js";
import { Container } from "../domain/container.js";

const LINE_COUNT = 4;
const LINE_CAPACITY = 8;
const PRIORITY_MIN = -1;
const PRIORITY_MAX = 5;

// Part 6.1 — exported so Engine/UI can reference the same constants
export const LOAD_DURATION_MS = 2000;
export const UNLOAD_DURATION_MS = 2000;

export class Port {
    constructor(bus = null) {
        this.bus = bus; // optional EventBus; null disables emissions

        this.lines = [];
        for (let i = 1; i <= LINE_COUNT; i++) {
            this.lines.push(new Line(i, LINE_CAPACITY));
        }
        this.ships = new HashMap();
        this.containers = new HashMap();
        this.containersByShip = new HashMap();
        this.yard = new HashMap();
        this.yardQueue = new Queue();
        this.atSeaQueue = new PriorityQueue();
        this.unloadStack = new Stack();
        this.dockingHistoryStack = new Stack();

        this.arrivalIndex = new BST();
        this.destGraph = new Graph();
        this.containerTrie = new Trie();
        this.shipTrie = new Trie();
        this.uniqueDestSet = new Set();

        this.seq = 0;
        this.simTime = 0;
    }

    // O(1) — safe emit (no-op if no bus)
    _emit(event, payload) {
        if (this.bus) this.bus.emit(event, payload);
    }

    // ---------- Creation ----------

    // O(1) avg
    addShip(shipId, name, arrival, priority = 2, capacity = 10) {
        if (priority < PRIORITY_MIN || priority > PRIORITY_MAX) return false;
        if (this.ships.has(shipId)) return false;
        const ship = new Ship(shipId, name, arrival, priority, capacity);
        this.ships.put(shipId, ship);
        this.arrivalIndex.insert([arrival, shipId], shipId);
        this.shipTrie.insert(shipId);
        this._emit("data:updated", { kind: "ship" });
        return true;
    }

    // O(1) avg
    addContainer(containerId, weight, dest) {
        if (this.containers.has(containerId)) return false;
        const c = new Container(containerId, weight, dest);
        this.containers.put(containerId, c);
        this.yard.put(containerId, c);
        this.yardQueue.enqueue(containerId);
        this.containerTrie.insert(containerId);
        this.uniqueDestSet.add(dest);
        this.destGraph.addNode(dest);
        this._emit("data:updated", { kind: "container" });
        return true;
    }

    // O(1)
    addRoute(fromDest, toDest) {
        this.destGraph.addEdge(fromDest, toDest);
        this._emit("data:updated", { kind: "route" });
    }

    // ---------- Assignment ----------

    // O(n)
    shipArrives(shipId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        const seq = this.seq++;
        this.assignToLine(ship, seq);
        return true;
    }

    // O(n log n) — fewest ships, tie → lowest ID (Part 4.2)
    assignToLine(ship, seq) {
        let target = null;
        for (const line of this.lines) {
            if (line.isFull()) continue;
            if (target === null || line.size() < target.size()) target = line;
        }

        if (target === null) {
            this.atSeaQueue.push(ship.priority, seq, ship.id);
            ship.status = "atSea";
            ship.currentLineId = null;
            this._emit("ship:overflown", { shipId: ship.id });
            return;
        }

        target.enqueue(ship, seq);
        ship.currentLineId = target.id;
        this._emit("ship:arrived", { shipId: ship.id, lineId: target.id });

        if (target.currentShipId === null) {
            target.advance();
            ship.status = "docked";
            this.dockingHistoryStack.push(ship.id);
            this._emit("ship:docked", { shipId: ship.id, lineId: target.id });
        } else {
            ship.status = "waiting";
        }
        this._emit("line:updated", { lineId: target.id, snapshot: target.snapshot(this) });
    }

    // O(log n) — Part 4.4 + 4.5 + 4.6
    depart(shipId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        if (ship.status === "loading" || ship.status === "unloading") return false;
        if (!ship.isEmpty()) return false;

        const line = this.lines[ship.currentLineId - 1];
        if (!line || line.currentShipId !== shipId) return false;

        const fromLineId = ship.currentLineId;
        ship.status = "departed";
        ship.currentLineId = null;
        this._emit("ship:departed", { shipId, lineId: fromLineId });

        // Part 4.4 — promote next waiting inside the line
        const promoted = line.advance();
        if (promoted) {
            const nextShip = this.ships.get(promoted);
            if (nextShip) {
                nextShip.status = "docked";
                this.dockingHistoryStack.push(promoted);
                this._emit("ship:docked", { shipId: promoted, lineId: line.id });
            }
        }

        // Part 4.5 — at-sea promotion (by priority)
        if (!this.atSeaQueue.isEmpty() && !line.isFull()) {
            const next = this.atSeaQueue.pop();
            const overShip = this.ships.get(next.shipId);
            if (overShip) {
                line.enqueue(overShip, next.seq);
                overShip.currentLineId = line.id;
                this._emit("ship:arrived", { shipId: overShip.id, lineId: line.id });
                if (line.currentShipId === null) {
                    line.advance();
                    overShip.status = "docked";
                    this.dockingHistoryStack.push(overShip.id);
                    this._emit("ship:docked", { shipId: overShip.id, lineId: line.id });
                } else {
                    overShip.status = "waiting";
                }
            }
        }

        this._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this) });
        return true;
    }

    // ---------- Loading / Unloading (Part 6.3) ----------

    // O(1) — starts a loading operation on the active ship (Part 4.6)
    startLoading(shipId, containerId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        const line = this.lines[ship.currentLineId - 1];
        if (!line || line.currentShipId !== shipId) return false;
        if (ship.status === "loading" || ship.status === "unloading") return false;
        if (ship.isFull()) return false;
        if (!this.containers.has(containerId)) return false;
        if (!this.yard.has(containerId)) return false;

        this.yard.delete(containerId);

        ship.status = "loading";
        ship.activeContainerId = containerId;
        ship.operationStartedAt = this.simTime;
        ship.operationDurationMs = LOAD_DURATION_MS;
        ship.progress = 0;

        this._emit("ship:loadingStarted", {
            shipId,
            containerId,
            durationMs: LOAD_DURATION_MS,
        });
        this._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this) });
        return true;
    }

    // O(1) — starts an unloading operation on the active ship
    startUnloading(shipId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        const line = this.lines[ship.currentLineId - 1];
        if (!line || line.currentShipId !== shipId) return false;
        if (ship.status === "loading" || ship.status === "unloading") return false;
        if (ship.isEmpty()) return false;

        const containerId = ship.peekTop();

        ship.status = "unloading";
        ship.activeContainerId = containerId;
        ship.operationStartedAt = this.simTime;
        ship.operationDurationMs = UNLOAD_DURATION_MS;
        ship.progress = 0;

        this._emit("ship:unloadingStarted", {
            shipId,
            containerId,
            durationMs: UNLOAD_DURATION_MS,
        });
        this._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this) });
        return true;
    }

    // O(n) — called by Engine.tick(); advances progress on all active loading/unloading ships
    updateProgress() {
        for (const line of this.lines) {
            if (line.currentShipId === null) continue;
            const ship = this.ships.get(line.currentShipId);
            if (!ship) continue;
            if (ship.status !== "loading" && ship.status !== "unloading") continue;

            const elapsed = this.simTime - ship.operationStartedAt;
            ship.progress = Math.min(1.0, elapsed / ship.operationDurationMs);

            this._emit("ship:progress", {
                shipId: ship.id,
                containerId: ship.activeContainerId,
                progress: ship.progress,
            });

            if (ship.progress >= 1.0) this._finalizeOperation(ship, line);
        }
    }

    // O(n log n) — finalize a loading/unloading operation
    _finalizeOperation(ship, line) {
        const containerId = ship.activeContainerId;
        const container = this.containers.get(containerId);

        if (ship.status === "loading") {
            ship.load(containerId);
            if (container) {
                container.status = "onShip";
                container.shipId = ship.id;
            }
            this._emit("ship:loadingFinished", { shipId: ship.id, containerId });
        } else {
            ship.unload();
            if (container) {
                container.status = "inYard";
                container.shipId = null;
                this.yard.put(containerId, container);
                this.yardQueue.enqueue(containerId);
            }
            this.unloadStack.push({ shipId: ship.id, containerId });
            this._emit("ship:unloadingFinished", { shipId: ship.id, containerId });
        }

        ship.status = "ready";
        ship.activeContainerId = null;
        ship.progress = 0;
        ship.operationStartedAt = null;
        ship.operationDurationMs = null;

        this._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this) });
    }

    // O(1) — undo the last unload (T12)
    undoUnload() {
        if (this.unloadStack.isEmpty()) return false;
        const entry = this.unloadStack.pop();
        const ship = this.ships.get(entry.shipId);
        const container = this.containers.get(entry.containerId);
        if (!ship || !container) return false;
        if (ship.isFull()) return false;

        ship.load(entry.containerId);
        container.status = "onShip";
        container.shipId = ship.id;
        this.yard.delete(entry.containerId);

        this._emit("data:updated", { kind: "container" });
        return true;
    }

    // ---------- Existing Queries ----------

    findContainer(containerId) {
        return this.containers.get(containerId);
    }

    containersOfShip(shipId) {
        const out = [];
        for (const c of this.containers.values()) {
            if (c.shipId === shipId) out.push(c);
        }
        return out;
    }

    // O(n log k) — MinHeap (T14)
    topHeaviest(k) {
        if (k <= 0) return [];
        const heap = new MinHeap();
        for (const c of this.containers.values()) {
            heap.insert(c.id, c.weight);
            if (heap.size() > k) heap.extractMin();
        }
        const out = [];
        while (!heap.isEmpty()) {
            const item = heap.extractMin();
            out.push([item.key, item.value]);
        }
        out.sort((a, b) => b[1] - a[1]);
        return out;
    }

    dockingHistory() {
        return this.dockingHistoryStack.toArray();
    }

    yardContents() {
        return this.yard.values().map((c) => ({
            id: c.id, weight: c.weight, dest: c.dest, status: c.status,
        }));
    }

    snapshot() {
        return {
            simTime: this.simTime,
            lines: this.lines.map((line) => line.snapshot(this)),
            atSea: this._atSeaSnapshot(),
            yard: this.yardContents(),
            destinations: this._destinationSnapshot(),
        };
    }

    _atSeaSnapshot() {
        const out = [];
        const items = [];
        while (!this.atSeaQueue.isEmpty()) {
            const item = this.atSeaQueue.pop();
            items.push(item);
            const ship = this.ships.get(item.shipId);
            if (ship) {
                out.push({
                    id: ship.id, name: ship.name,
                    priority: ship.priority,
                    priorityLabel: PRIORITY_LABELS[String(ship.priority)] || "Unknown",
                });
            }
        }
        for (const item of items) this.atSeaQueue.push(item.priority, item.seq, item.shipId);
        return out;
    }

    _destinationSnapshot() {
        const unique = this.uniqueDestSet.values();
        const routes = [];
        const seen = new Set();
        for (const node of this.destGraph.adj.keys()) {
            for (const nb of this.destGraph.neighbors(node)) {
                const a = node < nb ? node : nb;
                const b = node < nb ? nb : node;
                const key = a + "|" + b;
                if (seen.has(key)) continue;
                seen.add(key);
                routes.push([a, b]);
            }
        }
        return { unique, routes };
    }

    // ---------- Index Queries ----------

    shipsSortedByArrival() { return this.arrivalIndex.inorder().map((e) => e.value); }
    shipsInArrivalRange(t1, t2) { return this.arrivalIndex.range(t1, t2).map((e) => e.value); }
    reachableDestinations(start) { return this.destGraph.reachableFrom(start); }
    searchContainersByPrefix(prefix) { return this.containerTrie.searchPrefix(prefix); }
    searchShipsByPrefix(prefix) { return this.shipTrie.searchPrefix(prefix); }
    uniqueDestinations() { return this.uniqueDestSet.values(); }
}