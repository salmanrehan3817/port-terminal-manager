import { test } from "node:test";
import assert from "node:assert";
import { Port } from "../src/engine/port.js";

test("T1 — 4 emergencies distribute across 4 lines", () => {
    const p = new Port();
    p.addShip("E1", "Em1", 10, -1);
    p.addShip("E2", "Em2", 10, -1);
    p.addShip("E3", "Em3", 10, -1);
    p.addShip("E4", "Em4", 10, -1);
    p.shipArrives("E1");
    p.shipArrives("E2");
    p.shipArrives("E3");
    p.shipArrives("E4");
    assert.strictEqual(p.lines[0].currentShipId, "E1");
    assert.strictEqual(p.lines[1].currentShipId, "E2");
    assert.strictEqual(p.lines[2].currentShipId, "E3");
    assert.strictEqual(p.lines[3].currentShipId, "E4");
});

test("T2 — fill-shortest distribution + tie lowest ID", () => {
    const p = new Port();
    for (let i = 1; i <= 5; i++) p.addShip(`S${i}`, `N${i}`, 10);
    for (let i = 1; i <= 5; i++) p.shipArrives(`S${i}`);
    assert.strictEqual(p.lines[0].size(), 2);
    assert.strictEqual(p.lines[1].size(), 1);
    assert.strictEqual(p.lines[2].size(), 1);
    assert.strictEqual(p.lines[3].size(), 1);
    assert.strictEqual(p.lines[0].currentShipId, "S1");
    assert.strictEqual(p.ships.get("S5").status, "waiting");
});

test("T3 — emergency jumps waiting normals within a line (no preemption)", () => {
    const p = new Port();
    for (let i = 1; i <= 4; i++) {
        p.addShip(`N${i}`, `N${i}`, 10);
        p.shipArrives(`N${i}`);
    }
    for (let i = 5; i <= 8; i++) {
        p.addShip(`N${i}`, `N${i}`, 10);
        p.shipArrives(`N${i}`);
    }
    assert.deepStrictEqual(p.lines.map((l) => l.size()), [2, 2, 2, 2]);

    p.addShip("E1", "Em1", 10, -1);
    p.shipArrives("E1");
    assert.strictEqual(p.lines[0].size(), 3);

    p.depart("N1");
    assert.strictEqual(p.lines[0].currentShipId, "E1");
    assert.strictEqual(p.ships.get("E1").status, "docked");
    assert.strictEqual(p.ships.get("N5").status, "waiting");
});

test("T15 — priority validation (reject out-of-range, accept -1..5, default 2)", () => {
    const p = new Port();
    assert.strictEqual(p.addShip("S1", "Alpha", 10, 6), false);
    assert.strictEqual(p.addShip("S2", "Beta", 10, -2), false);
    assert.strictEqual(p.addShip("S3", "Gamma", 10, 5), true);
    assert.strictEqual(p.addShip("S4", "Delta", 10), true);
    assert.strictEqual(p.ships.get("S4").priority, 2);
});

test("addShip rejects duplicate shipId", () => {
    const p = new Port();
    assert.strictEqual(p.addShip("S1", "Alpha", 10), true);
    assert.strictEqual(p.addShip("S1", "Alpha2", 10), false);
});

test("addContainer registers in containerTrie, uniqueDestSet, destGraph", () => {
    const p = new Port();
    p.addContainer("C1", 20, "A");
    assert.strictEqual(p.containers.has("C1"), true);
    assert.strictEqual(p.uniqueDestSet.has("A"), true);
    assert.strictEqual(p.destGraph.neighbors("A").length, 0);
});

test("addRoute is undirected", () => {
    const p = new Port();
    p.addRoute("A", "B");
    assert.deepStrictEqual(p.destGraph.neighbors("A"), ["B"]);
    assert.deepStrictEqual(p.destGraph.neighbors("B"), ["A"]);
});

test("snapshot basic shape (Part 10.2 subset)", () => {
    const p = new Port();
    p.addShip("S1", "Alpha", 10);
    p.shipArrives("S1");
    const snap = p.snapshot();
    assert.strictEqual(snap.lines.length, 4);
    assert.strictEqual(snap.lines[0].id, 1);
    assert.strictEqual(snap.lines[0].ships.length, 1);
    assert.strictEqual(snap.lines[0].ships[0].id, "S1");
    assert.strictEqual(snap.lines[0].ships[0].priorityLabel, "Normal");
    assert.ok(Array.isArray(snap.atSea));
    assert.ok(Array.isArray(snap.yard));
    assert.ok(Array.isArray(snap.destinations.unique));
    assert.ok(Array.isArray(snap.destinations.routes));
});

test("depart requires empty cargo (Part 4.6)", () => {
    const p = new Port();
    p.addShip("S1", "Alpha", 10);
    p.shipArrives("S1");
    p.ships.get("S1").load("C1");
    assert.strictEqual(p.depart("S1"), false);
    p.ships.get("S1").unload();
    assert.strictEqual(p.depart("S1"), true);
});

// ============================================================
// Step 5 — M4b–M5b tests (T4, T5, T14, T16–T21 + extra)
// ============================================================

test("T4 — overflow to at-sea priority queue", () => {
    const p = new Port();
    for (let i = 1; i <= 32; i++) {
        p.addShip(`N${i}`, `N${i}`, 10);
        p.shipArrives(`N${i}`);
    }
    assert.deepStrictEqual(p.lines.map((l) => l.size()), [8, 8, 8, 8]);

    p.addShip("N33", "N33", 10);
    p.shipArrives("N33");
    p.addShip("E1", "E1", 10, -1);
    p.shipArrives("E1");

    const snap = p.snapshot();
    assert.strictEqual(snap.atSea.length, 2);
});

test("T5 — at-sea promotion on departure (by priority)", () => {
    const p = new Port();
    for (let i = 1; i <= 32; i++) {
        p.addShip(`N${i}`, `N${i}`, 10);
        p.shipArrives(`N${i}`);
    }
    p.addShip("N33", "N33", 10);
    p.shipArrives("N33");
    p.addShip("E1", "E1", 10, -1);
    p.shipArrives("E1");

    const before = p.snapshot();
    assert.strictEqual(before.atSea.length, 2);

    p.depart("N1");

    const after = p.snapshot();
    assert.strictEqual(after.atSea.length, 1);
    assert.ok(after.lines[0].ships.some((s) => s.id === "E1"));
});

test("T14 — topHeaviest(3)", () => {
    const p = new Port();
    p.addContainer("C1", 20, "A");
    p.addContainer("C2", 10, "B");
    p.addContainer("C3", 8, "C");
    p.addContainer("C4", 30, "D");
    p.addContainer("C5", 15, "E");

    assert.deepStrictEqual(p.topHeaviest(3), [
        ["C4", 30],
        ["C1", 20],
        ["C5", 15],
    ]);
});

test("T16 — shipsSortedByArrival (BST in-order)", () => {
    const p = new Port();
    p.addShip("S3", "Gamma", 11);
    p.addShip("S1", "Alpha", 10);
    p.addShip("S2", "Beta", 12);

    assert.deepStrictEqual(p.shipsSortedByArrival(), ["S1", "S3", "S2"]);
});

test("T17 — shipsInArrivalRange (BST range)", () => {
    const p = new Port();
    p.addShip("S3", "Gamma", 11);
    p.addShip("S1", "Alpha", 10);
    p.addShip("S2", "Beta", 12);

    assert.deepStrictEqual(p.shipsInArrivalRange(10, 11), ["S1", "S3"]);
    assert.deepStrictEqual(p.shipsInArrivalRange(12, 12), ["S2"]);
    assert.deepStrictEqual(p.shipsInArrivalRange(20, 30), []);
});

test("T18 — reachableDestinations (Graph BFS)", () => {
    const p = new Port();
    p.addRoute("A", "B");
    p.addRoute("B", "C");

    const fromA = p.reachableDestinations("A");
    assert.strictEqual(fromA.size(), 3);
    assert.strictEqual(fromA.has("A"), true);
    assert.strictEqual(fromA.has("B"), true);
    assert.strictEqual(fromA.has("C"), true);

    const fromC = p.reachableDestinations("C");
    assert.strictEqual(fromC.size(), 3);
});

test("T19 — Trie container prefix search", () => {
    const p = new Port();
    p.addContainer("C1", 20, "A");
    p.addContainer("C2", 5, "B");
    p.addContainer("C10", 8, "A");
    p.addContainer("C11", 6, "C");

    assert.deepStrictEqual(p.searchContainersByPrefix("C1").sort(), ["C1", "C10", "C11"]);
    assert.deepStrictEqual(p.searchContainersByPrefix("C").sort(), ["C1", "C10", "C11", "C2"]);
    assert.deepStrictEqual(p.searchContainersByPrefix("X"), []);
});

test("T20 — uniqueDestinations (Set)", () => {
    const p = new Port();
    p.addContainer("C1", 20, "A");
    p.addContainer("C2", 5, "B");
    p.addContainer("C3", 10, "A");

    const dests = p.uniqueDestinations();
    assert.strictEqual(dests.length, 2);
    assert.deepStrictEqual(dests.sort(), ["A", "B"]);
});

test("T21 — BFS terminates on cycle", () => {
    const p = new Port();
    p.addRoute("A", "B");
    p.addRoute("B", "A");

    const reach = p.reachableDestinations("A");
    assert.strictEqual(reach.size(), 2);
    assert.strictEqual(reach.has("A"), true);
    assert.strictEqual(reach.has("B"), true);
});

test("Trie ship prefix search", () => {
    const p = new Port();
    p.addShip("S1", "Alpha", 10);
    p.addShip("S2", "Beta", 10);
    p.addShip("S10", "Gamma", 10);

    assert.deepStrictEqual(p.searchShipsByPrefix("S").sort(), ["S1", "S10", "S2"]);
    assert.deepStrictEqual(p.searchShipsByPrefix("S1").sort(), ["S1", "S10"]);
});

test("snapshot destinations has unique + dedup'd routes", () => {
    const p = new Port();
    p.addContainer("C1", 20, "A");
    p.addContainer("C2", 5, "B");
    p.addContainer("C3", 10, "A");
    p.addRoute("A", "B");

    const snap = p.snapshot();
    assert.deepStrictEqual(snap.destinations.unique.sort(), ["A", "B"]);
    assert.strictEqual(snap.destinations.routes.length, 1);
    assert.deepStrictEqual(snap.destinations.routes[0], ["A", "B"]);
});

test("snapshot atSea has priority labels", () => {
    const p = new Port();
    for (let i = 1; i <= 32; i++) {
        p.addShip(`N${i}`, `N${i}`, 10);
        p.shipArrives(`N${i}`);
    }
    p.addShip("E1", "E1", 10, -1);
    p.shipArrives("E1");

    const snap = p.snapshot();
    assert.strictEqual(snap.atSea.length, 1);
    assert.strictEqual(snap.atSea[0].id, "E1");
    assert.strictEqual(snap.atSea[0].priority, -1);
    assert.strictEqual(snap.atSea[0].priorityLabel, "Emergency");
});

test("dockingHistory tracks docked ships in order", () => {
    const p = new Port();
    p.addShip("S1", "Alpha", 10);
    p.addShip("S2", "Beta", 10);
    p.shipArrives("S1");
    p.shipArrives("S2");
    const hist = p.dockingHistory();
    assert.deepStrictEqual(hist, ["S1", "S2"]);
});

// ============================================================
// Step 7 — M8 tests (T9 full snapshot shape)
// ============================================================

test("T9 — snapshot shape matches Part 10.2", () => {
    const p = new Port();

    // Active ship (L1) with cargo
    p.addShip("S1", "Alpha", 10, -1);   // Emergency
    p.shipArrives("S1");
    p.ships.get("S1").load("C1");

    // Waiting ship (L1)
    p.addShip("S2", "Beta", 10, 2);     // Normal
    p.shipArrives("S2");

    // Yard + routes
    p.addContainer("C2", 20, "A");
    p.addContainer("C3", 5, "B");
    p.addContainer("C4", 10, "A");
    p.addRoute("A", "B");

    const snap = p.snapshot();

    // --- Top-level fields ---
    assert.strictEqual(typeof snap.simTime, "number");
    assert.strictEqual(snap.lines.length, 4);
    assert.ok(Array.isArray(snap.atSea));
    assert.ok(Array.isArray(snap.yard));
    assert.ok(Array.isArray(snap.destinations.unique));
    assert.ok(Array.isArray(snap.destinations.routes));

    // --- Line shape ---
    for (const line of snap.lines) {
        assert.strictEqual(typeof line.id, "number");
        assert.ok(line.id >= 1 && line.id <= 4);
        assert.ok(Array.isArray(line.ships));
    }

    // --- Ship shape: every ship has all 7 required fields ---
    for (const line of snap.lines) {
        for (const ship of line.ships) {
            assert.strictEqual(typeof ship.id, "string");
            assert.strictEqual(typeof ship.name, "string");
            assert.strictEqual(typeof ship.priority, "number");
            assert.strictEqual(typeof ship.priorityLabel, "string");
            assert.strictEqual(typeof ship.state, "string");
            assert.strictEqual(typeof ship.capacity, "number");
            assert.strictEqual(typeof ship.used, "number");
        }
    }

    // --- Active ship's extra fields ---
    const activeShip = snap.lines[0].ships[0];
    assert.strictEqual(activeShip.id, "S1");
    assert.strictEqual(activeShip.priorityLabel, "Emergency");
    assert.strictEqual(activeShip.used, 1);
    assert.strictEqual("activeContainerId" in activeShip, true);
    assert.strictEqual("progress" in activeShip, true);

    // --- Yard shape ---
    for (const c of snap.yard) {
        assert.strictEqual(typeof c.id, "string");
        assert.strictEqual(typeof c.weight, "number");
        assert.strictEqual(typeof c.dest, "string");
        assert.strictEqual(typeof c.status, "string");
    }

    // --- Destinations: unique deduplicated ---
    assert.deepStrictEqual(snap.destinations.unique.sort(), ["A", "B"]);

    // --- Destinations: routes as [from, to] ---
    assert.strictEqual(snap.destinations.routes.length, 1);
    assert.strictEqual(snap.destinations.routes[0].length, 2);
    assert.deepStrictEqual(snap.destinations.routes[0], ["A", "B"]);
});

test("T9 — at-sea ships in snapshot have priorityLabel", () => {
    const p = new Port();
    for (let i = 1; i <= 32; i++) {
        p.addShip(`N${i}`, `N${i}`, 10);
        p.shipArrives(`N${i}`);
    }
    p.addShip("E1", "Emergency1", 10, -1);
    p.shipArrives("E1");

    const snap = p.snapshot();
    assert.strictEqual(snap.atSea.length, 1);
    assert.strictEqual(snap.atSea[0].id, "E1");
    assert.strictEqual(snap.atSea[0].name, "Emergency1");
    assert.strictEqual(snap.atSea[0].priority, -1);
    assert.strictEqual(snap.atSea[0].priorityLabel, "Emergency");
});

test("T9 — snapshot has no references to internal state", () => {
    const p = new Port();
    p.addShip("S1", "Alpha", 10);
    p.shipArrives("S1");

    const snap = p.snapshot();
    // Mutating snapshot must not affect internal ship object
    snap.lines[0].ships[0].name = "MUTATED";
    assert.strictEqual(p.ships.get("S1").name, "Alpha");

    // Mutating snapshot's lines array does not affect p.lines
    snap.lines.pop();
    assert.strictEqual(p.lines.length, 4);
});