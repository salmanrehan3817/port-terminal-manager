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
const HISTORY_CAP = 100;

export const LOAD_DURATION_MS = 2000;
export const UNLOAD_DURATION_MS = 2000;

export class Port {
    constructor(bus = null) {
        this.bus = bus;
        this.lines = [];
        for (let i = 1; i <= LINE_COUNT; i++) this.lines.push(new Line(i, LINE_CAPACITY));
        this.ships = new HashMap();
        this.containers = new HashMap();
        this.containersByShip = new HashMap();
        this.yard = new HashMap();
        this.yardQueue = new Queue();
        this.atSeaQueue = new PriorityQueue();
        this.processingShips = new HashMap();
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

    _emit(event, payload) { if (this.bus) this.bus.emit(event, payload); }

    _pushShipHistory(ship, action, info) {
        ship.history.push({ time: this.simTime, action, info });
        if (ship.history.length > HISTORY_CAP) ship.history.shift();
    }

    _pushContainerHistory(container, action, info) {
        container.history.push({ time: this.simTime, action, info });
        if (container.history.length > HISTORY_CAP) container.history.shift();
    }

    addShip(shipId, name, arrival, priority = 2, capacity = 10, originPort = "N/A", destinationPort = "N/A") {
        if (priority < PRIORITY_MIN || priority > PRIORITY_MAX) return false;
        if (this.ships.has(shipId)) return false;
        const ship = new Ship(shipId, name, arrival, priority, capacity, originPort, destinationPort);
        this.ships.put(shipId, ship);
        this.arrivalIndex.insert([arrival, shipId], shipId);
        this.shipTrie.insert(shipId);
        this._pushShipHistory(ship, "created", `priority ${priority}, route ${originPort} → ${destinationPort}`);
        this._emit("data:updated", { kind: "ship" });
        return true;
    }

    addContainer(containerId, weight, dest) {
        if (this.containers.has(containerId)) return false;
        const c = new Container(containerId, weight, dest);
        this.containers.put(containerId, c);
        this.yard.put(containerId, c);
        this.yardQueue.enqueue(containerId);
        this.containerTrie.insert(containerId);
        this.uniqueDestSet.add(dest);
        this.destGraph.addNode(dest);
        this._pushContainerHistory(c, "created", `weight ${weight} → ${dest}`);
        this._emit("data:updated", { kind: "container" });
        return true;
    }

    addRoute(fromDest, toDest) {
        this.destGraph.addEdge(fromDest, toDest);
        this._emit("data:updated", { kind: "route" });
    }

    shipArrives(shipId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        this.assignToLine(ship, this.seq++);
        return true;
    }

    shipArrivesOnLine(shipId, lineId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        return this.assignToSpecificLine(ship, this.seq++, lineId);
    }

    assignToLine(ship, seq) {
        ship.requestedLineId = null; // Auto mode
        let target = null;
        for (const line of this.lines) {
            if (line.isFull()) continue;
            if (target === null || line.size() < target.size()) target = line;
        }
        if (target === null) {
            this.atSeaQueue.push(ship.priority, seq, ship.id);
            ship.status = "waitingAtSea";
            ship.currentLineId = null;
            this._pushShipHistory(ship, "overflown", "all lines full → at sea");
            this._emit("ship:overflown", { shipId: ship.id });
            return;
        }
        this._enqueueIntoTarget(target, ship, seq);
    }

    assignToSpecificLine(ship, seq, lineId) {
        ship.requestedLineId = lineId;
        const target = this.lines[lineId - 1];
        if (!target) return false;

        // 🚨 PRIORITY PREEMPTION LOGIC
        if (target.isFull()) {
            const drained = [];
            while (!target.ships.isEmpty()) {
                drained.push(target.ships.pop());
            }
            // Since PriorityQueue pops highest priority first, the last item is the lowest priority
            const worstItem = drained[drained.length - 1];
            const worstShip = this.ships.get(worstItem.shipId);

            if (worstShip && ship.priority < worstShip.priority) {
                // New ship has higher urgency. Preempt!
                drained.pop();
                this.atSeaQueue.push(worstItem.priority, worstItem.seq, worstItem.shipId);
                worstShip.status = "waitingAtSea";
                worstShip.currentLineId = null;
                this._pushShipHistory(worstShip, "overflown", `preempted by ${ship.id} → at sea`);
                this._emit("ship:overflown", { shipId: worstShip.id });

                for (const item of drained) {
                    target.ships.push(item.priority, item.seq, item.shipId);
                }

                target.enqueue(ship, seq);
                ship.currentLineId = target.id;
                ship.status = "waiting";
                this._pushShipHistory(ship, "waiting", `line ${target.id} (preempted lower priority)`);
                this._emit("ship:arrived", { shipId: ship.id, lineId: target.id });
                this._emit("line:updated", { lineId: target.id, snapshot: target.snapshot(this) });
                return true;
            } else {
                for (const item of drained) {
                    target.ships.push(item.priority, item.seq, item.shipId);
                }
                this.atSeaQueue.push(ship.priority, seq, ship.id);
                ship.status = "waitingAtSea";
                ship.currentLineId = null;
                this._pushShipHistory(ship, "overflown", `line ${lineId} full → at sea`);
                this._emit("ship:overflown", { shipId: ship.id });
                return false;
            }
        } else {
            this.atSeaQueue.push(ship.priority, seq, ship.id);
            ship.status = "waitingAtSea";
            ship.currentLineId = null;

            const overItem = this._popFromAtSeaForLine(lineId);
            if (overItem) {
                const overShip = this.ships.get(overItem.shipId);
                if (overShip) {
                    this._enqueueIntoTarget(target, overShip, overItem.seq);
                    return overItem.shipId === ship.id;
                }
            }
            return false;
        }
    }

    _enqueueIntoTarget(target, ship, seq) {
        target.enqueue(ship, seq);
        ship.currentLineId = target.id;
        this._emit("ship:arrived", { shipId: ship.id, lineId: target.id });

        if (target.currentShipId === null) {
            target.advance();
            ship.status = "docked";
            this.dockingHistoryStack.push(ship.id);
            this._pushShipHistory(ship, "docked", `line ${target.id}`);
            this._emit("ship:docked", { shipId: ship.id, lineId: target.id });
        } else {
            ship.status = "waiting";
            this._pushShipHistory(ship, "waiting", `line ${target.id}`);
        }
        this._emit("line:updated", { lineId: target.id, snapshot: target.snapshot(this) });
    }

    _popFromAtSeaForLine(lineId) {
        if (this.atSeaQueue.isEmpty()) return null;
        const items = [];
        let matchItem = null;
        while (!this.atSeaQueue.isEmpty()) {
            const item = this.atSeaQueue.pop();
            const ship = this.ships.get(item.shipId);
            if (!matchItem && ship && (ship.requestedLineId === lineId || ship.requestedLineId == null)) {
                matchItem = item;
            } else {
                items.push(item);
            }
        }
        for (const item of items) {
            this.atSeaQueue.push(item.priority, item.seq, item.shipId);
        }
        return matchItem;
    }

    _moveToProcessing(ship) {
        if (ship.currentLineId === null) return false;
        const line = this.lines[ship.currentLineId - 1];
        if (!line || line.currentShipId !== ship.id) return false;

        const oldLineId = ship.currentLineId;
        line.currentShipId = null;
        ship.currentLineId = null;
        ship.status = "processing";
        this.processingShips.put(ship.id, ship);
        this._pushShipHistory(ship, "processing", `left line ${oldLineId}, ${ship.containerCount()} containers`);

        if (!line.ships.isEmpty()) {
            const promoted = line.advance();
            if (promoted) {
                const next = this.ships.get(promoted);
                if (next) {
                    next.status = "docked";
                    this.dockingHistoryStack.push(promoted);
                    this._pushShipHistory(next, "docked", `line ${oldLineId} (promoted)`);
                    this._emit("ship:docked", { shipId: promoted, lineId: oldLineId });
                }
            }
        }

        if (!this.atSeaQueue.isEmpty() && !line.isFull()) {
            const overItem = this._popFromAtSeaForLine(line.id);
            if (overItem) {
                const overShip = this.ships.get(overItem.shipId);
                if (overShip) {
                    line.enqueue(overShip, overItem.seq);
                    overShip.currentLineId = line.id;
                    this._emit("ship:arrived", { shipId: overShip.id, lineId: line.id });
                    if (line.currentShipId === null) {
                        line.advance();
                        overShip.status = "docked";
                        this.dockingHistoryStack.push(overShip.id);
                        this._pushShipHistory(overShip, "docked", `line ${line.id} (from at-sea)`);
                        this._emit("ship:docked", { shipId: overShip.id, lineId: line.id });
                    } else {
                        overShip.status = "waiting";
                        this._pushShipHistory(overShip, "waiting", `line ${line.id} (from at-sea)`);
                    }
                }
            }
        }

        this._emit("ship:processing", { shipId: ship.id, lineId: oldLineId });
        this._emit("line:updated", { lineId: oldLineId, snapshot: line.snapshot(this) });
        this._emit("data:updated", { kind: "ship" });
        return true;
    }

    depart(shipId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        if (ship.status === "loading" || ship.status === "unloading") return false;

        if (this.processingShips.has(shipId)) {
            this.processingShips.delete(shipId);
            ship.status = "departed";
            ship.currentLineId = null;
            this._pushShipHistory(ship, "departed", "from processing (loaded)");
            this._emit("ship:departed", { shipId, lineId: null });
            this._emit("data:updated", { kind: "ship" });
            return true;
        }

        if (!ship.isEmpty()) return false;

        if (ship.currentLineId === null) return false;
        const line = this.lines[ship.currentLineId - 1];
        if (!line || line.currentShipId !== shipId) return false;

        const fromLineId = ship.currentLineId;
        ship.status = "departed";
        ship.currentLineId = null;
        this._pushShipHistory(ship, "departed", `from line ${fromLineId}`);
        this._emit("ship:departed", { shipId, lineId: fromLineId });

        if (!line.ships.isEmpty()) {
            const promoted = line.advance();
            if (promoted) {
                const next = this.ships.get(promoted);
                if (next) {
                    next.status = "docked";
                    this.dockingHistoryStack.push(promoted);
                    this._pushShipHistory(next, "docked", `line ${line.id} (promoted)`);
                    this._emit("ship:docked", { shipId: promoted, lineId: line.id });
                }
            }
        }

        if (!this.atSeaQueue.isEmpty() && !line.isFull()) {
            const overItem = this._popFromAtSeaForLine(line.id);
            if (overItem) {
                const overShip = this.ships.get(overItem.shipId);
                if (overShip) {
                    line.enqueue(overShip, overItem.seq);
                    overShip.currentLineId = line.id;
                    this._emit("ship:arrived", { shipId: overShip.id, lineId: line.id });
                    if (line.currentShipId === null) {
                        line.advance();
                        overShip.status = "docked";
                        this.dockingHistoryStack.push(overShip.id);
                        this._pushShipHistory(overShip, "docked", `line ${line.id} (from at-sea)`);
                        this._emit("ship:docked", { shipId: overShip.id, lineId: line.id });
                    } else {
                        overShip.status = "waiting";
                        this._pushShipHistory(overShip, "waiting", `line ${line.id} (from at-sea)`);
                    }
                }
            }
        }

        this._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this) });
        return true;
    }

    startLoading(shipId, containerId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        const inLine = ship.currentLineId !== null &&
            this.lines[ship.currentLineId - 1]?.currentShipId === shipId;
        const inProcessing = this.processingShips.has(shipId);
        if (!inLine && !inProcessing) return false;
        if (ship.status === "loading" || ship.status === "unloading") return false;
        if (ship.isFull()) return false;
        if (!this.containers.has(containerId)) return false;
        if (!this.yard.has(containerId)) return false;

        if (ship.listContainers().includes(containerId)) {
            return false;
        }

        this.yard.delete(containerId);
        ship.status = "loading";
        ship.activeContainerId = containerId;
        ship.operationStartedAt = this.simTime;
        ship.operationDurationMs = LOAD_DURATION_MS;
        ship.progress = 0;

        this._pushShipHistory(ship, "loading", containerId);
        const container = this.containers.get(containerId);
        if (container) this._pushContainerHistory(container, "loading", `ship ${shipId}`);

        this._emit("ship:loadingStarted", { shipId, containerId, durationMs: LOAD_DURATION_MS });
        if (inLine) {
            const line = this.lines[ship.currentLineId - 1];
            this._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this) });
        }
        return true;
    }

    startUnloading(shipId) {
        const ship = this.ships.get(shipId);
        if (!ship) return false;
        const inLine = ship.currentLineId !== null &&
            this.lines[ship.currentLineId - 1]?.currentShipId === shipId;
        const inProcessing = this.processingShips.has(shipId);
        if (!inLine && !inProcessing) return false;
        if (ship.status === "loading" || ship.status === "unloading") return false;
        if (ship.isEmpty()) return false;

        ship.status = "unloading";
        ship.activeContainerId = ship.peekTop();
        ship.operationStartedAt = this.simTime;
        ship.operationDurationMs = UNLOAD_DURATION_MS;
        ship.progress = 0;

        this._pushShipHistory(ship, "unloading", ship.activeContainerId);
        const container = this.containers.get(ship.activeContainerId);
        if (container) this._pushContainerHistory(container, "unloading", `ship ${shipId}`);

        this._emit("ship:unloadingStarted", { shipId, containerId: ship.activeContainerId, durationMs: UNLOAD_DURATION_MS });
        return true;
    }

    updateProgress() {
        const applyProgress = (ship, line) => {
            const elapsed = this.simTime - ship.operationStartedAt;
            ship.progress = Math.min(1.0, elapsed / ship.operationDurationMs);
            this._emit("ship:progress", { shipId: ship.id, containerId: ship.activeContainerId, progress: ship.progress });
            if (ship.progress >= 1.0) this._finalizeOperation(ship, line);
        };

        for (const line of this.lines) {
            if (line.currentShipId === null) continue;
            const ship = this.ships.get(line.currentShipId);
            if (!ship) continue;
            if (ship.status !== "loading" && ship.status !== "unloading") continue;
            applyProgress(ship, line);
        }

        for (const ship of this.processingShips.values()) {
            if (ship.status !== "loading" && ship.status !== "unloading") continue;
            applyProgress(ship, null);
        }
    }

    _finalizeOperation(ship, line) {
        const containerId = ship.activeContainerId;
        const container = this.containers.get(containerId);
        const wasLoading = ship.status === "loading";

        if (wasLoading) {
            ship.load(containerId);
            if (container) { container.status = "onShip"; container.shipId = ship.id; }
            this._pushShipHistory(ship, "loaded", containerId);
            if (container) this._pushContainerHistory(container, "loaded", `ship ${ship.id}`);
            this._emit("ship:loadingFinished", { shipId: ship.id, containerId });
        } else {
            ship.unload();
            if (container) {
                container.status = "inYard";
                container.shipId = null;
                this.yard.put(containerId, container);
                this.yardQueue.enqueue(containerId);
            }
            this._pushShipHistory(ship, "unloaded", containerId);
            if (container) this._pushContainerHistory(container, "unloaded", `ship ${ship.id}`);
            this.unloadStack.push({ shipId: ship.id, containerId });
            this._emit("ship:unloadingFinished", { shipId: ship.id, containerId });
        }

        ship.activeContainerId = null;
        ship.progress = 0;
        ship.operationStartedAt = null;
        ship.operationDurationMs = null;

        if (wasLoading && line) {
            const yardEmpty = this.yard.size() === 0;

            if (yardEmpty) {
                ship.status = "ready";
                this._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this) });
                return;
            }

            if (ship.isFull()) {
                ship.status = "ready";
                this._moveToProcessing(ship);
                return;
            }
        }

        ship.status = "ready";
        if (line) {
            this._emit("line:updated", { lineId: line.id, snapshot: line.snapshot(this) });
        } else {
            this._emit("data:updated", { kind: "ship" });
        }
    }

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
        this._pushShipHistory(ship, "undo-unload", entry.containerId);
        this._pushContainerHistory(container, "undo-unload", `ship ${ship.id}`);
        this._emit("data:updated", { kind: "container" });
        return true;
    }

    findContainer(containerId) { return this.containers.get(containerId); }

    containersOfShip(shipId) {
        const out = [];
        for (const c of this.containers.values()) if (c.shipId === shipId) out.push(c);
        return out;
    }

    topHeaviest(k) {
        if (k <= 0) return [];
        const heap = new MinHeap();
        for (const c of this.containers.values()) {
            heap.insert(c.id, c.weight);
            if (heap.size() > k) heap.extractMin();
        }
        const out = [];
        while (!heap.isEmpty()) { const it = heap.extractMin(); out.push([it.key, it.value]); }
        out.sort((a, b) => b[1] - a[1]);
        return out;
    }

    dockingHistory() { return this.dockingHistoryStack.toArray(); }

    yardContents() {
        return this.yard.values().map((c) => ({ id: c.id, weight: c.weight, dest: c.dest, status: c.status }));
    }

    getShipHistory(shipId) {
        const s = this.ships.get(shipId);
        return s ? s.history.slice() : [];
    }

    getContainerHistory(containerId) {
        const c = this.containers.get(containerId);
        return c ? c.history.slice() : [];
    }

    snapshot() {
        return {
            simTime: this.simTime,
            lines: this.lines.map((line) => line.snapshot(this)),
            processing: this._processingSnapshot(),
            atSea: this._atSeaSnapshot(),
            yard: this.yardContents(),
            destinations: this._destinationSnapshot(),
        };
    }

    _processingSnapshot() {
        const out = [];
        for (const ship of this.processingShips.values()) {
            out.push({
                id: ship.id, name: ship.name,
                priority: ship.priority,
                priorityLabel: PRIORITY_LABELS[String(ship.priority)] || "Unknown",
                state: ship.status,
                capacity: ship.capacity,
                used: ship.containerCount(),
                activeContainerId: ship.activeContainerId,
                progress: ship.progress,
                containers: ship.listContainers(),
            });
        }
        return out;
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
                    state: ship.status,
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

    shipsSortedByArrival() { return this.arrivalIndex.inorder().map((e) => e.value); }
    shipsInArrivalRange(t1, t2) { return this.arrivalIndex.range(t1, t2).map((e) => e.value); }
    reachableDestinations(start) { return this.destGraph.reachableFrom(start); }
    searchContainersByPrefix(prefix) { return this.containerTrie.searchPrefix(prefix); }
    searchShipsByPrefix(prefix) { return this.shipTrie.searchPrefix(prefix); }
    uniqueDestinations() { return this.uniqueDestSet.values(); }
}