export class MinHeap {
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
