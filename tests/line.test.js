import { test } from "node:test";
import assert from "node:assert";
import { Line } from "../src/domain/line.js";
import { Ship } from "../src/domain/ship.js";
import { HashMap } from "../src/structures/hash_map.js";

test("Line constructor defaults (id, capacity 8, empty, no current)", () => {
    const l = new Line(1);
    assert.strictEqual(l.id, 1);
    assert.strictEqual(l.capacity, 8);
    assert.strictEqual(l.currentShipId, null);
    assert.strictEqual(l.size(), 0);
    assert.strictEqual(l.isEmpty(), true);
    assert.strictEqual(l.isFull(), false);
});

test("Line enqueue does not auto-promote (Port does)", () => {
    const l = new Line(1);
    const s = new Ship("S1", "Alpha", 10);
    l.enqueue(s, 1);
    assert.strictEqual(l.currentShipId, null);  // still null
    assert.strictEqual(l.size(), 1);            // waiting ship counted
});

test("Line advance promotes next waiting ship", () => {
    const l = new Line(1);
    l.enqueue(new Ship("S1", "Alpha", 10), 1);
    const promoted = l.advance();
    assert.strictEqual(promoted, "S1");
    assert.strictEqual(l.currentShipId, "S1");
    assert.strictEqual(l.size(), 1);  // still 1 (active)
});

test("Line advance on empty returns null, current null", () => {
    const l = new Line(1);
    assert.strictEqual(l.advance(), null);
    assert.strictEqual(l.currentShipId, null);
});

test("Line advance pops highest priority waiting ship first", () => {
    const l = new Line(1);
    l.enqueue(new Ship("S1", "Alpha", 10, 2), 1);   // Normal
    l.enqueue(new Ship("S2", "Beta", 10, -1), 2);  // Emergency
    l.enqueue(new Ship("S3", "Gamma", 10, 0), 3);   // Critical
    assert.strictEqual(l.advance(), "S2");  // Emergency
    assert.strictEqual(l.advance(), "S3");  // Critical
    assert.strictEqual(l.advance(), "S1");  // Normal
    assert.strictEqual(l.advance(), null);
});

test("Line no preemption (Part 4.3) — new higher-priority does not replace active", () => {
    const l = new Line(1);
    l.enqueue(new Ship("S1", "Alpha", 10, 2), 1);
    l.advance();  // S1 active
    l.enqueue(new Ship("S2", "Beta", 10, -1), 2);  // Emergency arrives later
    assert.strictEqual(l.currentShipId, "S1");     // STILL S1 — no preemption
    assert.strictEqual(l.size(), 2);
});

test("Line size includes current ship", () => {
    const l = new Line(1);
    l.enqueue(new Ship("S1", "Alpha", 10), 1);
    l.enqueue(new Ship("S2", "Beta", 10), 2);
    assert.strictEqual(l.size(), 2);
    l.advance();  // S1 active
    assert.strictEqual(l.size(), 2);  // 1 active + 1 waiting
    assert.strictEqual(l.currentShipId, "S1");
});

test("Line isFull at capacity 8", () => {
    const l = new Line(1);
    for (let i = 1; i <= 8; i++) {
        l.enqueue(new Ship(`S${i}`, `N${i}`, 10), i);
    }
    assert.strictEqual(l.size(), 8);
    assert.strictEqual(l.isFull(), true);
    l.advance();              // promote S1
    assert.strictEqual(l.isFull(), true);  // still 8 (7 waiting + 1 active)
});

test("Line peek returns next waiting ship, not current", () => {
    const l = new Line(1);
    l.enqueue(new Ship("S1", "Alpha", 10, 2), 1);
    l.enqueue(new Ship("S2", "Beta", 10, -1), 2);
    const next = l.peek();
    assert.strictEqual(next.shipId, "S2");  // Emergency on top
});

test("Line snapshot returns plain object with ships (active first)", () => {
    const port = { ships: new HashMap() };

    const s1 = new Ship("S1", "Alpha", 10, -1);  // Emergency
    s1.status = "docked";
    s1.load("C1");
    port.ships.put("S1", s1);

    const s2 = new Ship("S2", "Beta", 10, 2);    // Normal
    s2.status = "waiting";
    port.ships.put("S2", s2);

    const l = new Line(1);
    l.enqueue(s1, 1);
    l.advance();       // S1 active
    l.enqueue(s2, 2);  // S2 waiting

    const snap = l.snapshot(port);
    assert.strictEqual(snap.id, 1);
    assert.strictEqual(snap.ships.length, 2);
    assert.strictEqual(snap.ships[0].id, "S1");             // active first
    assert.strictEqual(snap.ships[0].priorityLabel, "Emergency");
    assert.strictEqual(snap.ships[0].used, 1);
    assert.strictEqual(snap.ships[0].state, "docked");
    assert.strictEqual(snap.ships[1].id, "S2");
    assert.strictEqual(snap.ships[1].priorityLabel, "Normal");
    assert.strictEqual(snap.ships[1].used, 0);
});

test("Line snapshot does not consume the queue", () => {
    const port = { ships: new HashMap() };
    const s1 = new Ship("S1", "Alpha", 10);
    port.ships.put("S1", s1);
    const l = new Line(1);
    l.enqueue(s1, 1);
    const before = l.size();
    l.snapshot(port);
    const after = l.size();
    assert.strictEqual(before, after);  // queue intact
});