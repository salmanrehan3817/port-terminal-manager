// MinHeap ordered by numeric `value`.
// Used for: top heaviest containers — keep size <= k, extractMin() when size > k.
export class MinHeap {
    constructor() {
        this.heap = []; // array of { key, value }
    }

    // O(log n)
    insert(key, value) {
        this.heap.push({ key, value });
        this._siftUp(this.heap.length - 1);
    }

    // O(log n)
    extractMin() {
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
    peekMin() {
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

    // O(log n)
    _siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[i].value < this.heap[parent].value) {
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
            if (l < n && this.heap[l].value < this.heap[smallest].value) smallest = l;
            if (r < n && this.heap[r].value < this.heap[smallest].value) smallest = r;
            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }
}