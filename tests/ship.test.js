import { test } from "node:test";
import assert from "node:assert";
import { Ship } from "../src/domain/Ship.js";
import { Container } from "../src/domain/Container.js";

test("Container is a pure data holder", () => {
    const c = new Container("C1", 20, "A");
    assert.strictEqual(c.id, "C1");
    assert.strictEqual(c.weight, 20);
    assert.strictEqual(c.dest, "A");
    assert.strictEqual(c.status, "inYard");
    assert.strictEqual(c.shipId, null);
});

test("Ship defaults (priority=2, capacity=10, status=atSea)", () => {
    const s = new Ship("S1", "Alpha", 10);
    assert.strictEqual(s.priority, 2);
    assert.strictEqual(s.capacity, 10);
    assert.strictEqual(s.status, "atSea");
    assert.strictEqual(s.currentLineId, null);
    assert.strictEqual(s.activeContainerId, null);
    assert.strictEqual(s.progress, 0);
    assert.strictEqual(s.operationStartedAt, null);
    assert.strictEqual(s.containerCount(), 0);
    assert.strictEqual(s.isEmpty(), true);
    assert.strictEqual(s.isFull(), false);
});

test("Ship custom priority and capacity", () => {
    const s = new Ship("S1", "Alpha", 10, -1, 5);
    assert.strictEqual(s.priority, -1);
    assert.strictEqual(s.capacity, 5);
});

test("Ship load pushes onto cargo Stack (LIFO)", () => {
    const s = new Ship("S1", "Alpha", 10);
    assert.strictEqual(s.load("C1"), true);
    assert.strictEqual(s.load("C2"), true);
    assert.strictEqual(s.containerCount(), 2);
    assert.strictEqual(s.peekTop(), "C2");
    assert.strictEqual(s.unload(), "C2");
    assert.strictEqual(s.unload(), "C1");
    assert.strictEqual(s.unload(), undefined);
});

test("Ship load rejects when full", () => {
    const s = new Ship("S1", "Alpha", 10, 2, 2);
    assert.strictEqual(s.load("C1"), true);
    assert.strictEqual(s.load("C2"), true);
    assert.strictEqual(s.isFull(), true);
    assert.strictEqual(s.load("C3"), false);
    assert.strictEqual(s.containerCount(), 2);
});

test("Ship peekTop on empty returns undefined", () => {
    const s = new Ship("S1", "Alpha", 10);
    assert.strictEqual(s.peekTop(), undefined);
});

test("Ship listContainers bottom-to-top", () => {
    const s = new Ship("S1", "Alpha", 10);
    s.load("C1");
    s.load("C2");
    s.load("C3");
    assert.deepStrictEqual(s.listContainers(), ["C1", "C2", "C3"]);
});