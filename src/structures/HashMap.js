export class HashMap {
  constructor() { this.map = new Map(); }
  put(k, v) { this.map.set(k, v); }
  get(k) { return this.map.get(k); }
  has(k) { return this.map.has(k); }
  delete(k) { return this.map.delete(k); }
  keys() { return Array.from(this.map.keys()); }
  values() { return Array.from(this.map.values()); }
  size() { return this.map.size; }
}
