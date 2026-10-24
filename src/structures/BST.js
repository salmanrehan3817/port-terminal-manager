export class BSTNode {
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
