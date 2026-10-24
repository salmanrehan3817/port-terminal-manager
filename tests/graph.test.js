import { test } from "node:test";
import assert from "node:assert";
import { Graph } from "../src/structures/graph.js";

test("Graph addEdge is undirected", () => {
    const g = new Graph();
    g.addEdge("A", "B");
    assert.deepStrictEqual(g.neighbors("A"), ["B"]);
    assert.deepStrictEqual(g.neighbors("B"), ["A"]);
});

test("Graph neighbors on isolated node", () => {
    const g = new Graph();
    g.addNode("X");
    assert.deepStrictEqual(g.neighbors("X"), []);
});

test("Graph BFS traversal order (A -> B -> C)", () => {
    const g = new Graph();
    g.addEdge("A", "B");
    g.addEdge("B", "C");
    assert.deepStrictEqual(g.bfs("A"), ["A", "B", "C"]);
});

test("Graph reachability from A and C (T18)", () => {
    const g = new Graph();
    g.addEdge("A", "B");
    g.addEdge("B", "C");
    assert.deepStrictEqual(g.reachableFrom("A").values().sort(), ["A", "B", "C"]);
    assert.deepStrictEqual(g.reachableFrom("C").values().sort(), ["A", "B", "C"]);
});

test("Graph BFS terminates on cycle (T21)", () => {
    const g = new Graph();
    g.addEdge("A", "B");
    g.addEdge("B", "A");
    assert.deepStrictEqual(g.reachableFrom("A").values().sort(), ["A", "B"]);
});

test("Graph reachableFrom unknown node returns empty Set", () => {
    const g = new Graph();
    g.addEdge("A", "B");
    assert.strictEqual(g.reachableFrom("Z").size(), 0);
});