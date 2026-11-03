// PriorityQueue ordered by (priority asc, seq asc, shipId asc).
// Lower priority value = higher urgency (-1 is highest, 5 is lowest).
// Backed by a binary min-heap.

export class PriorityQueue {
    constructor() {
        this.heap = []; // array of { priority, seq, shipId }
    }

    // ============================================================================
    // METHOD: push
    // PURPOSE: Normal insertion of an item into the min-heap.
    // ============================================================================
    push(priority, seq, shipId) {
        this.heap.push({ priority, seq, shipId });
        this._siftUp(this.heap.length - 1);
    }

    // ============================================================================
    // METHOD: pushWithEviction (NEW - Professional Preemption Logic)
    // PURPOSE: Pushes a ship into the queue. If the queue is full, it compares the 
    //          new ship with the lowest priority ship currently in the queue.
    //          If the new ship has higher priority, it evicts the lowest one and 
    //          returns the evicted ship. Otherwise, it rejects the new ship and 
    //          returns the new ship object.
    // ============================================================================
    pushWithEviction(priority, seq, shipId, maxCapacity) {
        // Agar jagah hai, toh seedha push kar do
        if (this.heap.length < maxCapacity) {
            this.push(priority, seq, shipId);
            return null;
        }

        // Agar full hai, toh sab se lowest priority (worst) ship dhoondo
        let worstIndex = 0;
        for (let i = 1; i < this.heap.length; i++) {
            const current = this.heap[i];
            const worst = this.heap[worstIndex];

            // Jo zyada priority number rakhta hai (jaise 5 vs -1) wo worst hai
            if (current.priority > worst.priority ||
                (current.priority === worst.priority && current.seq > worst.seq)) {
                worstIndex = i;
            }
        }

        const worstItem = this.heap[worstIndex];

        // Compare new ship with the worst ship in queue
        const newIsBetter = (priority < worstItem.priority) ||
            (priority === worstItem.priority && seq < worstItem.seq);

        if (newIsBetter) {
            // Nayi ship behtar hai. Worst ship ko nikaal kar bahar bhej do.
            this._removeAt(worstIndex);
            this.push(priority, seq, shipId);
            return worstItem; // Evicted ship return karo taake Port usay At-Sea bhej de
        } else {
            // Nayi ship kharab hai. Isay accept na karo, wapas bhej do.
            return { priority, seq, shipId }; // Rejected new ship
        }
    }

    // ============================================================================
    // METHOD: pop
    // PURPOSE: Removes and returns the highest priority item (root of min-heap).
    // ============================================================================
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

    // ============================================================================
    // METHOD: peek
    // PURPOSE: Returns the highest priority item without removing it.
    // ============================================================================
    peek() {
        return this.heap[0];
    }

    // ============================================================================
    // METHOD: size
    // PURPOSE: Returns the total number of items in the queue.
    // ============================================================================
    size() {
        return this.heap.length;
    }

    // ============================================================================
    // METHOD: isEmpty
    // PURPOSE: Returns true if the queue has no items.
    // ============================================================================
    isEmpty() {
        return this.heap.length === 0;
    }

    // ============================================================================
    // METHOD: _compare (Internal)
    // PURPOSE: Compares two items to determine their order in the heap.
    // ============================================================================
    _compare(a, b) {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.seq !== b.seq) return a.seq - b.seq;
        return a.shipId < b.shipId ? -1 : a.shipId > b.shipId ? 1 : 0;
    }

    // ============================================================================
    // METHOD: _removeAt (Internal)
    // PURPOSE: Removes an item at a specific index and repairs the heap.
    // ============================================================================
    _removeAt(index) {
        if (index >= this.heap.length) return;
        const last = this.heap.pop();
        if (index < this.heap.length) {
            this.heap[index] = last;
            this._siftUp(index);
            this._siftDown(index);
        }
    }

    // ============================================================================
    // METHOD: _siftUp (Internal)
    // PURPOSE: Moves an item up the heap to its correct position (Bubble Up).
    // ============================================================================
    _siftUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this._compare(this.heap[i], this.heap[parent]) < 0) {
                [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
                i = parent;
            } else break;
        }
    }

    // ============================================================================
    // METHOD: _siftDown (Internal)
    // PURPOSE: Moves an item down the heap to its correct position (Bubble Down).
    // ============================================================================
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