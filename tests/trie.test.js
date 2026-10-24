import { test } from "node:test";
import assert from "node:assert";
import { Trie } from "../src/structures/trie.js";

test("Trie insert + exact search", () => {
    const t = new Trie();
    t.insert("C1");
    t.insert("C10");
    assert.strictEqual(t.search("C1"), true);
    assert.strictEqual(t.search("C10"), true);
    assert.strictEqual(t.search("C"), false);
    assert.strictEqual(t.search("C2"), false);
});

test("Trie searchPrefix (T19 scenario)", () => {
    const t = new Trie();
    t.insert("C1");
    t.insert("C2");
    t.insert("C10");
    t.insert("C11");

    assert.deepStrictEqual(t.searchPrefix("C1").sort(), ["C1", "C10", "C11"]);
    assert.deepStrictEqual(t.searchPrefix("C").sort(), ["C1", "C10", "C11", "C2"]);
    assert.deepStrictEqual(t.searchPrefix("X"), []);
});

test("Trie startsWith", () => {
    const t = new Trie();
    t.insert("S1");
    t.insert("S2");
    assert.strictEqual(t.startsWith("S"), true);
    assert.strictEqual(t.startsWith("S1"), true);
    assert.strictEqual(t.startsWith("X"), false);
});

test("Trie searchPrefix returns empty for no matches", () => {
    const t = new Trie();
    t.insert("A");
    assert.deepStrictEqual(t.searchPrefix("B"), []);
});