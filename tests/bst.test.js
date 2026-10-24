import { test } from "node:test";
import assert from "node:assert";
import { BST } from "../src/structures/bineary_search_tree.js";

test("BST inorder gives sorted-by-arrival list (T16 scenario)", () => {
    const t = new BST();
    t.insert([11, "S3"], "S3");
    t.insert([10, "S1"], "S1");
    t.insert([12, "S2"], "S2");
    const values = t.inorder().map((e) => e.value);
    assert.deepStrictEqual(values, ["S1", "S3", "S2"]);
});

test("BST search exact key", () => {
    const t = new BST();
    t.insert([10, "S1"], "S1");
    t.insert([12, "S2"], "S2");
    assert.strictEqual(t.search([10, "S1"]), "S1");
    assert.strictEqual(t.search([12, "S2"]), "S2");
    assert.strictEqual(t.search([99, "S9"]), undefined);
});

test("BST range query (T17 cases)", () => {
    const t = new BST();
    t.insert([10, "S1"], "S1");
    t.insert([11, "S3"], "S3");
    t.insert([12, "S2"], "S2");
    assert.deepStrictEqual(t.range(10, 11).map((e) => e.value), ["S1", "S3"]);
    assert.deepStrictEqual(t.range(12, 12).map((e) => e.value), ["S2"]);
    assert.deepStrictEqual(t.range(20, 30).map((e) => e.value), []);
});

test("BST same arrival, different shipId — lexicographic tie-break", () => {
    const t = new BST();
    t.insert([10, "S2"], "S2");
    t.insert([10, "S1"], "S1");
    const values = t.inorder().map((e) => e.value);
    assert.deepStrictEqual(values, ["S1", "S2"]);
});

test("BST min / max", () => {
    const t = new BST();
    t.insert([10, "S1"], "S1");
    t.insert([12, "S2"], "S2");
    t.insert([11, "S3"], "S3");
    assert.strictEqual(t.min().value, "S1");
    assert.strictEqual(t.max().value, "S2");
});