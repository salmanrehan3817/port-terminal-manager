import { test } from "node:test";
import assert from "node:assert";
import { Stack } from "../src/structures/stack.js";

test("Stack push/pop LIFO", () => {
    const s = new Stack();
    s.push(1);
    s.push(2);
    s.push(3);
    assert.strictEqual(s.pop(), 3);
    assert.strictEqual(s.pop(), 2);
    assert.strictEqual(s.pop(), 1);
    assert.strictEqual(s.pop(), undefined);
});

test("Stack peek", () => {
    const s = new Stack();
    s.push("a");
    assert.strictEqual(s.peek(), "a");
    s.pop();
    assert.strictEqual(s.peek(), undefined);
});

test("Stack isEmpty and size", () => {
    const s = new Stack();
    assert.strictEqual(s.isEmpty(), true);
    assert.strictEqual(s.size(), 0);
    s.push(1);
    assert.strictEqual(s.isEmpty(), false);
    assert.strictEqual(s.size(), 1);
});

test("Stack toArray bottom-to-top", () => {
    const s = new Stack();
    s.push(1);
    s.push(2);
    s.push(3);
    assert.deepStrictEqual(s.toArray(), [1, 2, 3]);
});