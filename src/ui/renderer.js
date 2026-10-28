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
import { DetailModal } from "./detail_model.js";
import { ShipCard } from "./ship_card.js";

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

        // ─────────────────────────────────────────────────────
        // Click handlers — ship card + yard card → detail modal
        // ─────────────────────────────────────────────────────
        this.linesContainer.addEventListener("click", (ev) => {
            const card = ev.target.closest(".ship-card");
            if (!card) return;
            const shipId = card.dataset.shipId;
            if (shipId) DetailModal.showShip(shipId);
        });

        this.yardList.addEventListener("click", (ev) => {
            const card = ev.target.closest(".yard-card");
            if (!card) return;
            const containerId = card.dataset.containerId;
            if (containerId) DetailModal.showContainer(containerId);
        });
        this.processingList = document.getElementById("processingList");

        this.processingList.addEventListener("click", (ev) => {
            const card = ev.target.closest(".ship-card");
            if (!card) return;
            const shipId = card.dataset.shipId;
            if (shipId) DetailModal.showShip(shipId);
        });
    }

    // O(n) — full render; splits loading/unloading ships into processing view
    static renderAll(snapshot) {
        const { lines, processing } = this._splitShips(snapshot);

        for (const line of lines) {
            const col = this.linesContainer.querySelector(`[data-line-id="${line.id}"]`);
            if (col) LineColumn.render(col, line, this.shipMap);
        }
        this._renderAtSea(snapshot.atSea);
        this._renderProcessing(processing);
        this._renderYard(snapshot.yard);
        RoutesPanel.refresh(snapshot);
    }

    // O(1) — wire event handlers
    static subscribe(bus) {
        bus.on("engine:tick", (p) => this._onTick(p));
        bus.on("line:updated", (p) => this._onLineUpdated(p));
        bus.on("ship:progress", (p) => this._onShipProgress(p));
        bus.on("ship:overflown", () => this._onShipOverflown());
        bus.on("ship:processing", () => this._onProcessingUpdated());
        bus.on("data:updated", (p) => this._onDataUpdated(p));
    }

    // ----- Event handlers -----

    // O(n) — refresh routes per Part 9.5
    static _onTick() {
        RoutesPanel.refresh(this.engine.getSnapshot());
    }

    // O(n) — one column re-render + refresh processing/at-sea/yard
    static _onLineUpdated({ lineId, snapshot }) {
        const col = this.linesContainer.querySelector(`[data-line-id="${lineId}"]`);
        if (!col) return;

        const snap = this.engine.getSnapshot();
        const { lines, processing } = this._splitShips(snap);
        const line = lines.find((l) => l.id === lineId);
        if (line) LineColumn.render(col, line, this.shipMap);

        this._renderAtSea(snap.atSea);
        this._renderProcessing(processing);
        this._renderYard(snap.yard);
    }

    // O(1) — update progress + container id + label
    static _onShipProgress({ shipId, containerId, progress }) {
        const card = this.shipMap.get(shipId);
        if (!card) return;

        const pct = Math.round(progress * 100);
        const fill = card.querySelector(".progress-fill");
        const text = card.querySelector(".progress-text");
        const cidEl = card.querySelector(".container-id");

        if (fill) fill.style.width = pct + "%";
        if (text) text.textContent = pct + "%";
        if (cidEl && containerId) cidEl.textContent = containerId;

        // 👇 Force finish update for UI responsiveness
        if (progress >= 0.99) {
            const progressRow = card.querySelector(".ship-progress");
            if (progressRow) progressRow.classList.add("hidden");

            const containerRow = card.querySelector(".ship-container");
            if (containerRow) containerRow.classList.add("hidden");

            const stateEl = card.querySelector(".ship-state");
            if (stateEl) stateEl.textContent = "processing";

            const loadedRow = card.querySelector(".ship-loaded");
            if (loadedRow) {
                const loadingChip = loadedRow.querySelector(".loading-chip");
                if (loadingChip && containerId) {
                    loadingChip.className = "loaded-chip";
                    loadingChip.textContent = "✓ " + containerId;

                    // 👇 INSTANT CAPACITY TEXT UPDATE
                    const capacityEl = card.querySelector(".ship-capacity");
                    if (capacityEl) {
                        const match = capacityEl.textContent.match(/Loaded:\s*(\d+)\s*\/\s*(\d+)/);
                        if (match) {
                            const currentLoaded = parseInt(match[1], 10);
                            const maxCap = match[2];
                            capacityEl.textContent = `Loaded: ${currentLoaded + 1} / ${maxCap}`;
                        }
                    }
                }
            }
        }
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

    static _onDataUpdated() {
        const snap = this.engine.getSnapshot();
        RoutesPanel.refresh(snap);
        this._renderYard(snap.yard);
        this._renderProcessing(snap.processing);   // ← NEW
        this._renderAtSea(snap.atSea);              // ← at-sea may also change
    }

    // O(n) — processing panel: shows ships in loading/unloading/processing/ready states
    static _renderProcessing(processing) {
        const el = document.getElementById("processingList");
        if (!el) return;

        // Remove stale ship cards whose parent is this panel
        const seen = new Set();
        for (const s of processing) seen.add(s.id);
        for (const child of [...el.children]) {
            if (child.classList && child.classList.contains("ship-card")) {
                const sid = child.dataset.shipId;
                if (!seen.has(sid)) el.removeChild(child);
            }
        }

        if (processing.length === 0) return;

        // Reuse ShipCard elements from shipMap (same as line columns)
        for (const s of processing) {
            let card = this.shipMap.get(s.id);
            if (!card) {
                card = ShipCard.create(s);
                this.shipMap.set(s.id, card);
            } else {
                ShipCard.update(card, s);
            }
            if (card.parentNode !== el) el.appendChild(card);
        }
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

    // O(n) — yard containers with labeled Name / Weight / Destination
    static _renderYard(yard) {
        if (!this.yardList) return;
        if (yard.length === 0) {
            this.yardList.innerHTML = "";
            return;
        }
        this.yardList.innerHTML = yard
            .map((c) => {
                return `<div class="yard-card" data-container-id="${this._esc(c.id)}">`
                    + `<div class="yard-card-id">${this._esc(c.id)}</div>`
                    + `<div class="yard-card-row">`
                    + `<span class="yard-card-label">Name</span>`
                    + `<span class="yard-card-value">${this._esc(c.id)}</span>`
                    + `</div>`
                    + `<div class="yard-card-row">`
                    + `<span class="yard-card-label">Weight</span>`
                    + `<span class="yard-card-value">${this._esc(String(c.weight))}</span>`
                    + `</div>`
                    + `<div class="yard-card-row">`
                    + `<span class="yard-card-label">Destination</span>`
                    + `<span class="yard-card-value">${this._esc(c.dest)}</span>`
                    + `</div>`
                    + `</div>`;
            })
            .join("");
    }
    // O(n) — split ships: loading/unloading go to processing view; rest stay in lines
    static _splitShips(snapshot) {
        const processing = [];
        const lines = [];

        // Include ships already in the processingShips area (from engine)
        for (const s of (snapshot.processing || [])) processing.push(s);

        for (const line of snapshot.lines) {
            const visibleShips = [];
            for (const s of line.ships) {
                if (s.state === "loading" || s.state === "unloading") {
                    processing.push(s);
                } else {
                    visibleShips.push(s);
                }
            }
            lines.push({ id: line.id, ships: visibleShips });
        }
        return { lines, processing };
    }
}