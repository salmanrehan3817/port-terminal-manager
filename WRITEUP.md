
---

## 📄 File 2 — `C:\port_management\WRITEUP.md` (NEW)

```markdown
# Data Structure Choices — Why Each Was Used

This project uses **nine** custom data structures, each implemented from scratch. This document explains **why** each was chosen for its specific job.

---

## 1. Stack (LIFO)

**Where used:**
- `Ship.containers` — the cargo hold
- `Port.unloadStack` — undo-unload history
- `Port.dockingHistoryStack` — chronological docking history

**Why:**
- **Cargo hold**: The top container is the one that unloads first. Loading pushes to the top, unloading pops from the top — exactly LIFO. A queue or array would force arbitrary-order access and lose the semantic meaning.
- **Undo unload**: Undo operations are inherently LIFO — the most recent unload is the first to be reversed. Stack gives O(1) undo without tracking indexes.
- **Docking history**: `dockingHistory()` returns events in order; Stack's `toArray()` preserves chronological order without extra bookkeeping.

**Complexity:** push/pop/peek/isEmpty/size — all **O(1)**.

---

## 2. Queue (FIFO)

**Where used:**
- `Port.yardQueue` — yard containers in arrival order
- `Graph.bfs` — breadth-first traversal

**Why:**
- **Yard**: Containers enter and leave the yard in time order. FIFO preserves that. A stack would reverse order, and an array would need index management.
- **BFS**: Breadth-first search requires processing nodes in the order discovered — Queue gives that for free. DFS would need a Stack; the reachability requirement (Part 3.7) wants shortest-hop paths, which BFS provides.

**Complexity:** enqueue/dequeue/front/isEmpty/size — **O(1)** amortized.

---

## 3. PriorityQueue

**Where used:**
- Four per-line queues (`Line.ships`)
- `Port.atSeaQueue` — overflow ships

**Why:**
- **Per-line order**: Within a line, ships are serviced by `(priority, seq)` — lower priority number first, earlier arrival first. A plain Queue or Stack cannot express this ordering.
- **At-sea promotion**: When a line frees a slot, the most urgent overflow ship should enter. PriorityQueue makes `pop()` return the highest-priority waiting ship in O(log n).

**Why binary heap internally:** Guarantees O(log n) push/pop regardless of insertion order. A sorted array would make push O(n), which matters because arrivals happen continuously.

**Why tie-break by `seq`:** Two ships with the same priority should be serviced in arrival order. Using a monotonically increasing `seq` counter (not `arrival` time, which can be equal) guarantees stable ordering.

**Complexity:** push/pop — **O(log n)**. peek/size/isEmpty — **O(1)**.

---

## 4. HashMap

**Where used:**
- `Port.ships` — ships by ID
- `Port.containers` — containers by ID
- `Port.containersByShip` — ship → containers mapping
- `Port.yard` — containers currently in the yard
- `Graph.adj` — adjacency list node → neighbors

**Why:**
- **ID lookups**: Every action (`startLoading`, `depart`, `findContainer`) starts with an ID lookup. O(1) average access is essential; an array-of-objects with linear search would make the system O(n) per operation.
- **Buckets + chaining**: Simple, predictable performance. Modulo hashing on string char-codes gives even distribution for typical IDs like `"S1"`, `"C10"`.

**Complexity:** put/get/has/delete — **O(1)** average. keys/values — **O(n)**.

---

## 5. MinHeap

**Where used:**
- `Port.topHeaviest(k)` — Top-k heaviest containers

**Why:**
- **Top-k pattern**: To find the k heaviest containers among N, keep a min-heap of size ≤ k. Push each container; if heap exceeds k, extract the minimum. At the end, the heap contains exactly the k heaviest. This runs in **O(N log k)** instead of O(N log N) for sorting all N.
- **Semantic fit**: A max-heap of all N would waste memory and require extracting k times from a large heap. MinHeap-of-size-k is the canonical solution to the top-k problem.

**Complexity:** insert — **O(log k)** amortized in the top-k pattern. extractMin — **O(log k)**.

---

## 6. BST (Binary Search Tree)

**Where used:**
- `Port.arrivalIndex` — the arrival-time index

**Why a BST specifically (not just a sorted array or HashMap):**
- **Sorted list**: In-order traversal returns ships in arrival order in **O(n)**. A HashMap cannot; a sorted array could, but insertion would be O(n).
- **Range query**: "Ships arriving between t1 and t2" runs in **O(log n + k)** by pruning subtrees outside the range. A linear scan would be O(n).
- **Successor query** (implicit in range): Find the next ship arriving after `t` in O(log n).

**Key design:** The key is a tuple `[arrival, shipId]` compared lexicographically. This makes the tree a stable sorted index — two ships arriving at the same time are ordered by ID, so traversal order is deterministic.

**Why not a balanced tree (AVL/RB):** Simplicity. For typical port scale (hundreds of ships, not millions), an unbalanced BST delivers O(log n) average insertion and perfectly fine lookups. If the port grew to tens of thousands of ships with adversarial arrival order, a balanced tree would be required — but that would add complexity without changing the public API.

**Complexity:** insert — **O(log n)** average, **O(n)** worst. search/inorder/range/min/max — **O(log n)** to **O(n)**.

---

## 7. Graph (undirected)

**Where used:**
- `Port.destGraph` — destination route network

**Why a Graph:**
- **Reachability**: "Which destinations can be reached from A?" is a graph problem, not a linear one.
- **BFS**: Shortest-hop paths on unweighted edges (all routes treated equally).
- **Undirected**: Routes are symmetric — if A connects to B, B connects to A. `addEdge` adds both directions in O(1).

**Why adjacency via HashMap of neighbor arrays:**
- **O(1) neighbor lookup** — no scan required.
- **O(V + E) traversal** — BFS only visits nodes and edges once.
- Sparse graphs (destination networks usually are) work well with this representation.

**BFS uses Queue and Set together:**
- **Queue**: preserves visit order — needed for BFS.
- **Set**: tracks visited nodes — prevents infinite loops in cyclic graphs (a requirement proven by test T21: A↔B cycle terminates).

**Complexity:** addEdge/neighbors — **O(1)**. bfs/reachableFrom — **O(V + E)**.

---

## 8. Trie (prefix tree)

**Where used:**
- `Port.shipTrie` — ship ID prefix search
- `Port.containerTrie` — container ID prefix search

**Why a Trie (not a HashMap or a sorted array):**
- **Prefix lookup**: The search bar types `C1` → returns `C1`, `C10`, `C11`. A HashMap would require scanning every key (O(n) per keystroke). A Trie does this in **O(p + k)** where p = prefix length and k = number of matches — **independent of total ID count**.
- **Search-as-you-type**: UI calls on every keystroke. With a linear structure, this would degrade to O(N) per keypress; with a Trie, it stays fast.
- **Scalability**: Ships and containers accumulate over time. Trie's prefix cost does not grow with the corpus — only with prefix length and matches.

**Internal note:** The Trie uses the **native** `Map` for children (per Part 12.9), not the custom HashMap. This is allowed because Tries do not appear on the "replace with built-in" list of structures being validated — the JS `Map` is a language primitive here, not a data structure the project owns.

**Complexity:** insert/search/startsWith — **O(p)**. searchPrefix — **O(p + k)**.

---

## 9. Set

**Where used:**
- `Port.uniqueDestSet` — unique destinations across all containers
- `Graph` BFS visited tracking

**Why a Set (not just an array):**
- **Uniqueness**: A Set automatically deduplicates. `addContainer("C1", 20, "A")` and `addContainer("C3", 10, "A")` result in a single `"A"` in `uniqueDestinations()` — no manual dedup loop required.
- **O(1) membership**: BFS visited check `if (!visited.has(nb))` is O(1) — critical for O(V + E) BFS traversal.
- **O(1) insert**: Tracking new destinations as containers arrive is O(1) per container.

**Why built on the custom HashMap (per Part 12.10):**
- **Consistency**: The project's rules require custom structures to build on each other where specified. `Set` extends `HashMap` with `{key: true}` entries — one less implementation to maintain separately.
- **Clean separation**: If the HashMap improves (e.g., a resize policy), the Set improves with it for free.

**Complexity:** add/has/delete — **O(1)** average. size — **O(1)**. values — **O(n)**.

---

## Summary Table

| Structure | Primary Use | Key Benefit | Complexity |
|---|---|---|---|
| Stack | Cargo hold, undo history | LIFO semantics | O(1) |
| Queue | Yard order, BFS | FIFO order | O(1) amortized |
| PriorityQueue | Line queues, at-sea | Order by (priority, seq) | O(log n) |
| HashMap | ID lookups | O(1) access | O(1) average |
| MinHeap | Top-k heaviest | O(N log k) instead of O(N log N) | O(log k) per op |
| BST | Arrival index | Range/successor in O(log n + k) | O(log n) average |
| Graph | Destination routes | Reachability + shortest-hop | O(V + E) |
| Trie | Prefix search | O(p + k) — independent of corpus | O(p + k) |
| Set | Unique tracking, BFS visited | O(1) dedup + membership | O(1) average |

---

## Validation

All nine structures are validated by `tools/verify-builtin.js` (M13): each is temporarily swapped with a built-in equivalent, the full test suite runs, and if all tests still pass, the custom structure is proven functionally correct.