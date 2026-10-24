import { test } from "node:test";
import assert from "node:assert";
import { HashMap } from "../src/structures/hash_map.js";

test("HashMap put/get", () => {
    const m = new HashMap();
    m.put("S1", { name: "Alpha" });
    m.put("S2", { name: "Beta" });
    assert.deepStrictEqual(m.get("S1"), { name: "Alpha" });
    assert.deepStrictEqual(m.get("S2"), { name: "Beta" });
    assert.strictEqual(m.get("S3"), undefined);
});

test("HashMap has", () => {
    const m = new HashMap();
    m.put("C1", 20);
    assert.strictEqual(m.has("C1"), true);
    assert.strictEqual(m.has("C2"), false);
});

test("HashMap delete", () => {
    const m = new HashMap();
    m.put("A", 1);
    assert.strictEqual(m.delete("A"), true);
    assert.strictEqual(m.has("A"), false);
    assert.strictEqual(m.delete("A"), false);
});

test("HashMap keys/values/size", () => {
    const m = new HashMap();
    m.put("A", 1);
    m.put("B", 2);
    assert.strictEqual(m.size(), 2);
    assert.deepStrictEqual(m.keys().sort(), ["A", "B"]);
    assert.deepStrictEqual(m.values().sort(), [1, 2]);
});

test("HashMap overwrite same key", () => {
    const m = new HashMap();
    m.put("A", 1);
    m.put("A", 2);
    assert.strictEqual(m.get("A"), 2);
    assert.strictEqual(m.size(), 1);
});