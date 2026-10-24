import { test } from "node:test";
import assert from "node:assert";
import { PriorityQueue } from "../src/structures/priority_queue.js";

test("PriorityQueue orders by priority (lower = higher urgency)", () => {
    const pq = new PriorityQueue();
    pq.push(2, 1, "N1");
    pq.push(-1, 2, "E1");
    pq.push(0, 3, "C1");
    assert.strictEqual(pq.pop().shipId, "E1");
    assert.strictEqual(pq.pop().shipId, "C1");
    assert.strictEqual(pq.pop().shipId, "N1");
});

test("PriorityQueue tie-breaks by seq (lower first)", () => {
    const pq = new PriorityQueue();
    pq.push(2, 5, "N5");
    pq.push(2, 3, "N3");
    pq.push(2, 4, "N4");
    assert.strictEqual(pq.pop().shipId, "N3");
    assert.strictEqual(pq.pop().shipId, "N4");
    assert.strictEqual(pq.pop().shipId, "N5");
});

test("PriorityQueue peek and size", () => {
    const pq = new PriorityQueue();
    pq.push(1, 1, "A");
    pq.push(0, 2, "B");
    assert.strictEqual(pq.peek().shipId, "B");
    assert.strictEqual(pq.size(), 2);
    assert.strictEqual(pq.isEmpty(), false);
});

test("PriorityQueue empty returns undefined", () => {
    const pq = new PriorityQueue();
    assert.strictEqual(pq.pop(), undefined);
    assert.strictEqual(pq.isEmpty(), true);
});