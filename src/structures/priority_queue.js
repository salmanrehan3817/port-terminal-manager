// PriorityQueue ordered by (priority asc, seq asc, shipId asc).
// Lower priority value = higher urgency (-1 is highest, 5 is lowest).
// Lower seq = earlier arrival among same priority.
// Backed by a binary min-heap.
// Used for: 4 line queues + 1 at-sea queue.
export class PriorityQueue {
    constructor() {
        this.heap = []; // array of { priority, seq, shipId }
    }

    // O(log n)
    push(priority, seq, shipId) {
        this.heap.push({ priority, seq, shipId });
        this._siftUp(this.heap.length - 1);
    }

    // O(log n)
    pop() {
        if (this.heap.length === 0) return undefined;
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this._siftDown(0);
        }
        return top;
    }

    // O(1)
    peek() {
        return this.heap[0];
    }

    // O(1)
    size() {
        return this.heap.length;
    }

    // O(1)
    isEmpty() {
        return this.heap.length === 0;
    }

    // O(1)
    _compare(a, b) {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.seq !== b.seq) return a.seq - b.seq;
        return a.shipId < b.shipId ? -1 : a.shipId > b.shipId ? 1 : 0;
    }

    // O(log n)
    _siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this._compare(this.heap[i], this.heap[parent]) < 0) {
                [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
                i = parent;
            } else break;
        }
    }

    // O(log n)
    _siftDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            if (l < n && this._compare(this.heap[l], this.heap[smallest]) < 0) smallest = l;
            if (r < n && this._compare(this.heap[r], this.heap[smallest]) < 0) smallest = r;
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}