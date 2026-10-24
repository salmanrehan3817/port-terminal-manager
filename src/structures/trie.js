// Prefix tree. Uses native JS Map for children (per Part 12.9).
// Used for: ship ID prefix search, container ID prefix search.
export class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEnd = false;
    }
}

export class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    // O(p) — p = word length
    insert(word) {
        let cur = this.root;
        for (const ch of String(word)) {
            if (!cur.children.has(ch)) cur.children.set(ch, new TrieNode());
            cur = cur.children.get(ch);
        }
        cur.isEnd = true;
    }

    // O(p) — exact match
    search(word) {
        let cur = this.root;
        for (const ch of String(word)) {
            if (!cur.children.has(ch)) return false;
            cur = cur.children.get(ch);
        }
        return cur.isEnd;
    }

    // O(p + k) — k = number of matches
    searchPrefix(prefix) {
        let cur = this.root;
        const p = String(prefix);
        for (const ch of p) {
            if (!cur.children.has(ch)) return [];
            cur = cur.children.get(ch);
        }
        const out = [];
        this._collect(cur, p, out);
        return out;
    }

    // O(k)
    _collect(node, prefix, out) {
        if (node.isEnd) out.push(prefix);
        for (const [ch, child] of node.children) {
            this._collect(child, prefix + ch, out);
        }
    }

    // O(p) — boolean
    startsWith(prefix) {
        let cur = this.root;
        for (const ch of String(prefix)) {
            if (!cur.children.has(ch)) return false;
            cur = cur.children.get(ch);
        }
        return true;
    }
}