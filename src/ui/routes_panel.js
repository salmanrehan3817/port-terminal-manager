// Routes panel (Part 9.5).
// Shows destination graph edges, a dropdown of destinations, the reachable set
// from the selected destination, and the unique destinations summary.
// Refreshes on data:updated and engine:tick (called by Renderer).

export class RoutesPanel {
    // O(1) — cache elements + wire dropdown change
    static init(engine, els) {
        this.engine = engine;
        this.edgesEl = els.edgesEl;
        this.selectEl = els.selectEl;
        this.reachableEl = els.reachableEl;
        this.uniqueEl = els.uniqueEl;

        this.selectEl.addEventListener("change", () => this._onSelect());
    }

    // O(n) — n = number of edges + destinations
    static refresh(snapshot) {
        const { unique, routes } = snapshot.destinations;

        // Edges list
        if (routes.length === 0) {
            this.edgesEl.innerHTML = `<span class="routes-empty">— no routes —</span>`;
        } else {
            this.edgesEl.innerHTML = routes
                .map(([a, b]) => `<span class="route-chip">${a} ↔ ${b}</span>`)
                .join("");
        }

        // Unique destinations summary
        if (unique.length === 0) {
            this.uniqueEl.textContent = "—";
        } else {
            this.uniqueEl.textContent = `{ ${unique.join(", ")} }`;
        }

        // Dropdown options (preserve selection if possible)
        const currentValue = this.selectEl.value;
        if (unique.length === 0) {
            this.selectEl.innerHTML = `<option value="">—</option>`;
        } else {
            this.selectEl.innerHTML = unique
                .map((d) => `<option>${d}</option>`)
                .join("");
            if (unique.includes(currentValue)) {
                this.selectEl.value = currentValue;
            } else {
                this.selectEl.value = unique[0];
            }
        }

        this._onSelect();
    }

    // O(V + E) — BFS from the selected destination
    static _onSelect() {
        const start = this.selectEl.value;
        if (!start) {
            this.reachableEl.textContent = "—";
            return;
        }
        const reach = this.engine.reachableDestinations(start);
        const vals = reach.values();
        this.reachableEl.textContent = vals.length ? vals.slice().sort().join(", ") : "—";
    }
}