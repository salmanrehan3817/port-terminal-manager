// Main renderer (Part 9.1–9.7).
// Owns the 4 line columns and coordinates ShipCard / LineColumn / SearchBar / RoutesPanel.
// Update strategy (Part 9.6):
//   - ship:progress  → targeted update of ONE progress bar
//   - line:updated   → re-render that one column (LineColumn reuses existing cards)
//   - data:updated   → refresh routes + yard
//   - engine:tick    → refresh routes (Part 9.5)
// No structures/domain imports. Only engine methods + snapshot objects.

import { LineColumn } from "./line_column.js";
import { SearchBar } from "./search_bar.js";
import { RoutesPanel } from "./routes_panel.js";

export class Renderer {
    // O(1) — cache containers + build the 4 columns + init sub-panels
    static init(engine) {
        this.engine = engine;
        this.shipMap = new Map();

        this.linesContainer = document.getElementById("linesContainer");
        this.atSeaList = document.getElementById("atSeaList");
        this.yardList = document.getElementById("yardList");

        // Build 4 empty columns
        for (let id = 1; id <= 4; id++) {
            this.linesContainer.appendChild(LineColumn.create(id));
        }

        // Sub-components
        SearchBar.init(
            engine,
            document.getElementById("searchInput"),
            document.getElementById("searchResults")
        );

        RoutesPanel.init(engine, {
            edgesEl: document.getElementById("routesEdges"),
            selectEl: document.getElementById("routesSelect"),
            reachableEl: document.getElementById("routesReachable"),
            uniqueEl: document.getElementById("routesUnique"),
        });
    }

    // O(n) — full render from a snapshot (Part 10.2)
    static renderAll(snapshot) {
        for (const line of snapshot.lines) {
            const col = this.linesContainer.querySelector(`[data-line-id="${line.id}"]`);
            if (col) LineColumn.render(col, line, this.shipMap);
        }
        this._renderAtSea(snapshot.atSea);
        this._renderYard(snapshot.yard);
        RoutesPanel.refresh(snapshot);
    }

    // O(1) — wire event handlers
    static subscribe(bus) {
        bus.on("engine:tick", (p) => this._onTick(p));
        bus.on("line:updated", (p) => this._onLineUpdated(p));
        bus.on("ship:progress", (p) => this._onShipProgress(p));
        bus.on("ship:overflown", () => this._onShipOverflown());
        bus.on("data:updated", (p) => this._onDataUpdated(p));
    }

    // ----- Event handlers -----

    // O(n) — refresh routes per Part 9.5
    static _onTick() {
        RoutesPanel.refresh(this.engine.getSnapshot());
    }

    // O(n) — one column only; also refresh at-sea (may have changed)
    static _onLineUpdated({ lineId, snapshot }) {
        const col = this.linesContainer.querySelector(`[data-line-id="${lineId}"]`);
        if (col) LineColumn.render(col, snapshot, this.shipMap);
        this._renderAtSea(this.engine.getSnapshot().atSea);
    }

    // O(1) — update only the progress bar (Part 9.6)
    static _onShipProgress({ shipId, progress }) {
        const card = this.shipMap.get(shipId);
        if (!card) return;
        const pct = Math.round(progress * 100);
        const fill = card.querySelector(".progress-fill");
        const text = card.querySelector(".progress-text");
        if (fill) fill.style.width = pct + "%";
        if (text) text.textContent = pct + "%";
    }

    // O(1) — at-sea queue changed
    static _onShipOverflown() {
        this._renderAtSea(this.engine.getSnapshot().atSea);
    }

    // O(n) — routes and yard may have changed
    static _onDataUpdated() {
        const snap = this.engine.getSnapshot();
        RoutesPanel.refresh(snap);
        this._renderYard(snap.yard);
    }

    // ----- Sub-panel renderers -----

    // O(n) — at-sea ships with priority color + name
    static _renderAtSea(atSea) {
        if (!this.atSeaList) return;
        if (atSea.length === 0) {
            this.atSeaList.innerHTML = "";
            return;
        }
        this.atSeaList.innerHTML = atSea
            .map((s) => {
                const label = s.priorityLabel || "Unknown";
                return `<span class="chip at-sea-chip" data-priority="${s.priority}">`
                    + `<span class="at-sea-id">${this._esc(s.id)}</span>`
                    + `<span class="at-sea-name">${this._esc(s.name || "")}</span>`
                    + `<span class="at-sea-label">${this._esc(label)}</span>`
                    + `</span>`;
            })
            .join("");
    }

    // O(1) — HTML escape helper
    static _esc(str) {
        return String(str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
        })[c]);
    }

    // O(n) — yard containers with weight + destination
    static _renderYard(yard) {
        if (!this.yardList) return;
        if (yard.length === 0) {
            this.yardList.innerHTML = "";
            return;
        }
        this.yardList.innerHTML = yard
            .map((c) => {
                return `<span class="chip yard-chip">`
                    + `<span class="yard-id">${this._esc(c.id)}</span>`
                    + `<span class="yard-weight">${this._esc(String(c.weight))}</span>`
                    + `<span class="yard-dest">→ ${this._esc(c.dest)}</span>`
                    + `</span>`;
            })
            .join("");
    }
}