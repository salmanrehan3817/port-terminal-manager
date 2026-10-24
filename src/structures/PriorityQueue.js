export class PriorityQueue {
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
