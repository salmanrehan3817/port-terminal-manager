// HashMap with string keys, backed by an array of buckets.
// Collision handling: separate chaining (arrays inside buckets).
// Used for: ships by ID, containers by ID, containersByShip, yard lookup.
export class HashMap {
    constructor(initialBuckets = 64) {
        this.buckets = Array.from({ length: initialBuckets }, () => []);
        this._size = 0;
    }

    // O(p) where p = key length
    _hash(key) {
        const s = String(key);
        let h = 0;
        for (let i = 0; i < s.length; i++) {
            h = (h * 31 + s.charCodeAt(i)) | 0;
        }
        return Math.abs(h) % this.buckets.length;
    }

    // O(1) average
    put(key, value) {
        const idx = this._hash(key);
        const bucket = this.buckets[idx];
        for (const entry of bucket) {
            if (entry.key === key) {
                entry.value = value;
                return;
            }
        }
        bucket.push({ key, value });
        this._size++;
    }

    // O(1) average
    get(key) {
        const idx = this._hash(key);
        for (const entry of this.buckets[idx]) {
            if (entry.key === key) return entry.value;
        }
        return undefined;
    }

    // O(1) average
    has(key) {
        const idx = this._hash(key);
        return this.buckets[idx].some((e) => e.key === key);
    }

    // O(1) average
    delete(key) {
        const idx = this._hash(key);
        const bucket = this.buckets[idx];
        const i = bucket.findIndex((e) => e.key === key);
        if (i === -1) return false;
        bucket.splice(i, 1);
        this._size--;
        return true;
    }

    // O(n)
    keys() {
        const out = [];
        for (const bucket of this.buckets) {
            for (const e of bucket) out.push(e.key);
        }
        return out;
    }

    // O(n)
    values() {
        const out = [];
        for (const bucket of this.buckets) {
            for (const e of bucket) out.push(e.value);
        }
        return out;
    }

    // O(1)
    size() {
        return this._size;
    }
}