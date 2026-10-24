import { test } from "node:test";
import assert from "node:assert";
import { Queue } from "../src/structures/queue.js";

test("Queue FIFO", () => {
    const q = new Queue();
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    assert.strictEqual(q.dequeue(), 1);
    assert.strictEqual(q.dequeue(), 2);
    assert.strictEqual(q.dequeue(), 3);
    assert.strictEqual(q.dequeue(), undefined);
});

test("Queue front", () => {
    const q = new Queue();
    q.enqueue("x");
    assert.strictEqual(q.front(), "x");
});

test("Queue isEmpty and size", () => {
    const q = new Queue();
    assert.strictEqual(q.isEmpty(), true);
    q.enqueue(1);
    q.enqueue(2);
    assert.strictEqual(q.isEmpty(), false);
    assert.strictEqual(q.size(), 2);
    q.dequeue();
    assert.strictEqual(q.size(), 1);
});