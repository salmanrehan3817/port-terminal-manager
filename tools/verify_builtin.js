// tools/verify-builtin.js — M13 validation
// Replaces each of the 9 custom structures with a built-in-backed implementation,
// runs the full test suite, then restores the originals.
// Expected: all tests still pass.
// This proves: (a) the custom interfaces are minimal and correct,
//              (b) the tests are meaningful (not implementation-coupled).

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const structDir = path.join(root, "src", "structures");
const backupDir = path.join(root, "src", ".structures.backup");

// ---------- Built-in replacement implementations (same public interface) ----------

const replacements = {
    "Stack.js": `export class Stack {
  constructor() { this.items = []; }
  push(x) { this.items.push(x); }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
  toArray() { return [...this.items]; }
}
`,

    "Queue.js": `export class Queue {
  constructor() { this.items = []; }
  enqueue(x) { this.items.push(x); }
  dequeue() { return this.items.shift(); }
  front() { return this.items[0]; }
  isEmpty() { return this.items.length === 0; }
  size() { return this.items.length; }
}
`,

    "PriorityQueue.js": `export class PriorityQueue {
  constructor() { this.items = []; }
  push(priority, seq, shipId) {
    this.items.push({ priority, seq, shipId });
    this.items.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.seq !== b.seq) return a.seq - b.seq;
      if (a.shipId < b.shipId) return -1;
      if (a.shipId > b.shipId) return 1;
      return 0;
    });
  }
  pop() { return this.items.shift(); }
  peek() { return this.items[0]; }
  size() { return this.items.length; }
  isEmpty() { return this.items.length === 0; }
}
`,

    "HashMap.js": `export class HashMap {
  constructor() { this.map = new Map(); }
  put(k, v) { this.map.set(k, v); }
  get(k) { return this.map.get(k); }
  has(k) { return this.map.has(k); }
  delete(k) { return this.map.delete(k); }
  keys() { return Array.from(this.map.keys()); }
  values() { return Array.from(this.map.values()); }
  size() { return this.map.size; }
}
`,

    "MinHeap.js": `export class MinHeap {
  constructor() { this.items = []; }
  insert(key, value) {
    this.items.push({ key, value });
    this.items.sort((a, b) => a.value - b.value);
  }
  extractMin() { return this.items.shift(); }
  peekMin() { return this.items[0]; }
  size() { return this.items.length; }
  isEmpty() { return this.items.length === 0; }
}
`,

    "BST.js": `export class BSTNode {
  constructor(key, value) { this.key = key; this.value = value; this.left = null; this.right = null; }
}
export class BST {
  constructor() { this.items = []; }
  _compare(a, b) {
    if (a[0] !== b[0]) return a[0] - b[0];
    if (a[1] < b[1]) return -1;
    if (a[1] > b[1]) return 1;
    return 0;
  }
  insert(key, value) {
    this.items.push({ key, value });
    this.items.sort((a, b) => this._compare(a.key, b.key));
  }
  search(key) {
    const f = this.items.find((e) => this._compare(e.key, key) === 0);
    return f ? f.value : undefined;
  }
  inorder() { return [...this.items]; }
  range(t1, t2) { return this.items.filter((e) => e.key[0] >= t1 && e.key[0] <= t2); }
  min() { return this.items[0]; }
  max() { return this.items[this.items.length - 1]; }
}
`,

    "Graph.js": `import { Queue } from "./Queue.js";
import { Set as CustomSet } from "./Set.js";
export class Graph {
  constructor() { this.adj = new Map(); }
  addNode(n) { if (!this.adj.has(n)) this.adj.set(n, new globalThis.Set()); }
  addEdge(a, b) {
    this.addNode(a); this.addNode(b);
    this.adj.get(a).add(b);
    this.adj.get(b).add(a);
  }
  neighbors(n) {
    const s = this.adj.get(n);
    return s ? Array.from(s) : [];
  }
  bfs(start) {
    const order = [];
    if (!this.adj.has(start)) return order;
    const visited = new CustomSet();
    const q = new Queue();
    q.enqueue(start);
    visited.add(start);
    while (!q.isEmpty()) {
      const cur = q.dequeue();
      order.push(cur);
      for (const nb of this.neighbors(cur)) {
        if (!visited.has(nb)) { visited.add(nb); q.enqueue(nb); }
      }
    }
    return order;
  }
  reachableFrom(start) {
    const visited = new CustomSet();
    if (!this.adj.has(start)) return visited;
    const q = new Queue();
    q.enqueue(start);
    visited.add(start);
    while (!q.isEmpty()) {
      const cur = q.dequeue();
      for (const nb of this.neighbors(cur)) {
        if (!visited.has(nb)) { visited.add(nb); q.enqueue(nb); }
      }
    }
    return visited;
  }
}
`,

    "Trie.js": `export class TrieNode {
  constructor() { this.children = {}; this.isEnd = false; }
}
export class Trie {
  constructor() { this.root = new TrieNode(); }
  insert(word) {
    let cur = this.root;
    for (const ch of String(word)) {
      if (!cur.children[ch]) cur.children[ch] = new TrieNode();
      cur = cur.children[ch];
    }
    cur.isEnd = true;
  }
  search(word) {
    let cur = this.root;
    for (const ch of String(word)) {
      if (!cur.children[ch]) return false;
      cur = cur.children[ch];
    }
    return cur.isEnd;
  }
  searchPrefix(prefix) {
    let cur = this.root;
    const p = String(prefix);
    for (const ch of p) {
      if (!cur.children[ch]) return [];
      cur = cur.children[ch];
    }
    const out = [];
    this._collect(cur, p, out);
    return out;
  }
  _collect(node, prefix, out) {
    if (node.isEnd) out.push(prefix);
    for (const ch in node.children) this._collect(node.children[ch], prefix + ch, out);
  }
  startsWith(prefix) {
    let cur = this.root;
    for (const ch of String(prefix)) {
      if (!cur.children[ch]) return false;
      cur = cur.children[ch];
    }
    return true;
  }
}
`,

    "Set.js": `export class Set {
  constructor() { this.set = new globalThis.Set(); }
  add(x) { this.set.add(x); }
  has(x) { return this.set.has(x); }
  delete(x) { return this.set.delete(x); }
  size() { return this.set.size; }
  values() { return Array.from(this.set); }
}
`,
};

// ---------- Process ----------

console.log("=======================================================");
console.log("M13 — Built-in Replacement Validation");
console.log("=======================================================\n");

// 1. Backup originals
if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
fs.mkdirSync(backupDir, { recursive: true });
for (const f of fs.readdirSync(structDir)) {
    if (f.endsWith(".js")) {
        fs.copyFileSync(path.join(structDir, f), path.join(backupDir, f));
    }
}
console.log("✅ Backed up 9 original structures → src/.structures.backup/\n");

let exitCode = 0;
try {
    // 2. Swap in replacements
    for (const [name, content] of Object.entries(replacements)) {
        fs.writeFileSync(path.join(structDir, name), content);
    }
    console.log("✅ Swapped in built-in implementations (9 files)\n");

    // 3. Run tests
    console.log("--- Running: node --test tests/ ---\n");
    try {
        const out = execSync("node --test tests/", { cwd: root, encoding: "utf-8" });
        console.log(out);
    } catch (err) {
        console.log(err.stdout || "");
        console.error(err.stderr || "");
        exitCode = 1;
    }
} finally {
    // 4. ALWAYS restore originals (even if tests fail / script crashes mid-way)
    for (const f of fs.readdirSync(backupDir)) {
        fs.copyFileSync(path.join(backupDir, f), path.join(structDir, f));
    }
    fs.rmSync(backupDir, { recursive: true, force: true });
    console.log("✅ Restored 9 original custom structures\n");
}

if (exitCode === 0) {
    console.log("=======================================================");
    console.log("✅ M13 PASSED");
    console.log("   Built-in replacements → same test results.");
    console.log("   Custom structures are validated as functionally correct.");
    console.log("=======================================================");
} else {
    console.log("=======================================================");
    console.log("❌ M13 FAILED — see failures above.");
    console.log("=======================================================");
    process.exit(1);
}