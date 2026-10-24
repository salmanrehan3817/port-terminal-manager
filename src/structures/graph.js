import { HashMap } from "./hash_map.js";
import { Queue } from "./queue.js";
import { Set } from "./set.js";

// Undirected graph of destination codes.
// Used for: reachability and shortest route (BFS on unweighted edges).
// BFS uses Queue for traversal and Set for visited tracking (Part 3.9).
export class Graph {
    constructor() {
        this.adj = new HashMap(); // node -> [neighbors]
    }

    // O(1)
    addNode(node) {
        if (!this.adj.has(node)) this.adj.put(node, []);
    }

    // O(1) — undirected; adds both directions
    addEdge(a, b) {
        this.addNode(a);
        this.addNode(b);
        const aList = this.adj.get(a);
        if (!aList.includes(b)) aList.push(b);
        const bList = this.adj.get(b);
        if (!bList.includes(a)) bList.push(a);
    }

    // O(1)
    neighbors(node) {
        return this.adj.has(node) ? this.adj.get(node) : [];
    }

    // O(V + E) — BFS using Queue and Set
    bfs(start) {
        const visited = new Set();
        const order = [];
        if (!this.adj.has(start)) return order;
        const q = new Queue();
        q.enqueue(start);
        visited.add(start);
        while (!q.isEmpty()) {
            const cur = q.dequeue();
            order.push(cur);
            for (const nb of this.neighbors(cur)) {
                if (!visited.has(nb)) {
                    visited.add(nb);
                    q.enqueue(nb);
                }
            }
        }
        return order;
    }

    // O(V + E) — returns Set of reachable nodes (including start)
    reachableFrom(start) {
        const visited = new Set();
        if (!this.adj.has(start)) return visited;
        const q = new Queue();
        q.enqueue(start);
        visited.add(start);
        while (!q.isEmpty()) {
            const cur = q.dequeue();
            for (const nb of this.neighbors(cur)) {
                if (!visited.has(nb)) {
                    visited.add(nb);
                    q.enqueue(nb);
                }
            }
        }
        return visited;
    }
}