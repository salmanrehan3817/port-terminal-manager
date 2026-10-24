import { test } from "node:test";
import assert from "node:assert";
import { Set } from "../src/structures/set.js";

test("Set add / has / delete / size", () => {
    const s = new Set();
    s.add("A");
    s.add("B");
    assert.strictEqual(s.has("A"), true);
    assert.strictEqual(s.has("Z"), false);
    assert.strictEqual(s.size(), 2);
    assert.strictEqual(s.delete("A"), true);
    assert.strictEqual(s.has("A"), false);
    assert.strictEqual(s.size(), 1);
    assert.strictEqual(s.delete("A"), false);
});

test("Set ignores duplicates (T20 scenario)", () => {
    const s = new Set();
    s.add("A");
    s.add("B");
    s.add("A");
    assert.strictEqual(s.size(), 2);
    assert.deepStrictEqual(s.values().sort(), ["A", "B"]);
});

test("Set values returns array of items", () => {
    const s = new Set();
    s.add("X");
    s.add("Y");
    s.add("Z");
    assert.deepStrictEqual(s.values().sort(), ["X", "Y", "Z"]);
});