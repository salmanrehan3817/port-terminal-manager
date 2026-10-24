import { test } from "node:test";
import assert from "node:assert";
import { MinHeap } from "../src/structures/min_heap.js";

test("MinHeap extractMin order", () => {
    const h = new MinHeap();
    h.insert("C1", 20);
    h.insert("C2", 5);
    h.insert("C3", 15);
    assert.strictEqual(h.extractMin().key, "C2");
    assert.strictEqual(h.extractMin().key, "C3");
    assert.strictEqual(h.extractMin().key, "C1");
});

test("MinHeap peekMin and size", () => {
    const h = new MinHeap();
    h.insert("C1", 20);
    h.insert("C2", 5);
    assert.strictEqual(h.peekMin().key, "C2");
    assert.strictEqual(h.size(), 2);
});

test("MinHeap empty returns undefined", () => {
    const h = new MinHeap();
    assert.strictEqual(h.isEmpty(), true);
    assert.strictEqual(h.extractMin(), undefined);
});

test("MinHeap top-3 heaviest pattern (T14 scenario)", () => {
    const h = new MinHeap();
    const data = [
        ["C1", 20],
        ["C2", 10],
        ["C3", 8],
        ["C4", 30],
        ["C5", 15],
    ];
    const k = 3;
    for (const [id, w] of data) {
        h.insert(id, w);
        if (h.size() > k) h.extractMin();
    }
    const result = [];
    while (!h.isEmpty()) result.push(h.extractMin());
    result.sort((a, b) => b.value - a.value);
    assert.deepStrictEqual(result, [
        { key: "C4", value: 30 },
        { key: "C1", value: 20 },
        { key: "C5", value: 15 },
    ]);
});