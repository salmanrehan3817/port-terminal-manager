// Binary Search Tree keyed by [arrival, shipId] tuples (lexicographic).
// Used for: Port's arrival index — sorted list, range query, successor query.
export class BSTNode {
    constructor(key, value) {
        this.key = key;     // [arrival, shipId]
        this.value = value; // shipId
        this.left = null;
        this.right = null;
    }
}

export class BST {
    constructor() {
        this.root = null;
    }

    // O(1)
    _compare(a, b) {
        if (a[0] !== b[0]) return a[0] - b[0];
        if (a[1] < b[1]) return -1;
        if (a[1] > b[1]) return 1;
        return 0;
    }

    // O(log n) average, O(n) worst
    insert(key, value) {
        const node = new BSTNode(key, value);
        if (!this.root) {
            this.root = node;
            return;
        }
        let cur = this.root;
        while (true) {
            if (this._compare(key, cur.key) < 0) {
                if (!cur.left) { cur.left = node; return; }
                cur = cur.left;
            } else {
                if (!cur.right) { cur.right = node; return; }
                cur = cur.right;
            }
        }
    }

    // O(log n) average
    search(key) {
        let cur = this.root;
        while (cur) {
            const c = this._compare(key, cur.key);
            if (c === 0) return cur.value;
            cur = c < 0 ? cur.left : cur.right;
        }
        return undefined;
    }

    // O(n) — sorted list of { key, value }
    inorder() {
        const out = [];
        this._inorder(this.root, out);
        return out;
    }

    // O(n)
    _inorder(node, out) {
        if (!node) return;
        this._inorder(node.left, out);
        out.push({ key: node.key, value: node.value });
        this._inorder(node.right, out);
    }

    // O(log n + k) — all entries with arrival in [t1, t2]
    range(t1, t2) {
        const out = [];
        this._range(this.root, t1, t2, out);
        return out;
    }

    // O(log n + k)
    _range(node, t1, t2, out) {
        if (!node) return;
        const a = node.key[0];
        if (a > t1) this._range(node.left, t1, t2, out);
        if (a >= t1 && a <= t2) out.push({ key: node.key, value: node.value });
        if (a < t2) this._range(node.right, t1, t2, out);
    }

    // O(log n)
    min() {
        if (!this.root) return undefined;
        let cur = this.root;
        while (cur.left) cur = cur.left;
        return { key: cur.key, value: cur.value };
    }

    // O(log n)
    max() {
        if (!this.root) return undefined;
        let cur = this.root;
        while (cur.right) cur = cur.right;
        return { key: cur.key, value: cur.value };
    }
}