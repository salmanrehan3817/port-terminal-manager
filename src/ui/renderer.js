// Main renderer
import { LineColumn } from "./line_column.js";
import { SearchBar } from "./search_bar.js";
import { RoutesPanel } from "./routes_panel.js";
import { DetailModal } from "./detail_model.js";
import { ShipCard } from "./ship_card.js";

export class Renderer {
    static init(engine) {
        this.engine = engine;
        this.shipMap = new Map();

        this.linesContainer = document.getElementById("linesContainer");
        this.atSeaList = document.getElementById("atSeaList");
        this.yardList = document.getElementById("yardList");
        this.processingList = document.getElementById("processingList");

        for (let id = 1; id <= 4; id++) {
            this.linesContainer.appendChild(LineColumn.create(id));
        }

        SearchBar.init(engine,
            document.getElementById("searchInput"),
            document.getElementById("searchResults"));

        RoutesPanel.init(engine, {
            edgesEl: document.getElementById("routesEdges"),
            selectEl: document.getElementById("routesSelect"),
            reachableEl: document.getElementById("routesReachable"),
            uniqueEl: document.getElementById("routesUnique"),
        });

        // Click handlers
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

        this.processingList.addEventListener("click", (ev) => {
            const card = ev.target.closest(".ship-card");
            if (!card) return;
            const shipId = card.dataset.shipId;
            if (shipId) DetailModal.showShip(shipId);
        });

        // 🚨 FIX: At Sea click handler
        this.atSeaList.addEventListener("click", (ev) => {
            const chip = ev.target.closest(".at-sea-chip");
            if (!chip) return;
            const shipId = chip.dataset.shipId;
            if (shipId) DetailModal.showShip(shipId);
        });
    }

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

    static subscribe(bus) {
        bus.on("engine:tick", (p) => this._onTick(p));
        bus.on("line:updated", (p) => this._onLineUpdated(p));
        bus.on("ship:progress", (p) => this._onShipProgress(p));
        bus.on("ship:overflown", () => this._onShipOverflown());
        bus.on("ship:processing", () => this._onProcessingUpdated());
        bus.on("data:updated", (p) => this._onDataUpdated(p));
    }

    static _onTick() {
        RoutesPanel.refresh(this.engine.getSnapshot());
    }

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

    static _onShipOverflown() {
        const snap = this.engine.getSnapshot();
        this._renderAtSea(snap.atSea);
    }

    static _onProcessingUpdated() {
        const snap = this.engine.getSnapshot();
        this._renderProcessing(snap.processing);
        this._renderAtSea(snap.atSea);
    }

    static _onDataUpdated() {
        const snap = this.engine.getSnapshot();
        RoutesPanel.refresh(snap);
        this._renderYard(snap.yard);
        this._renderProcessing(snap.processing);
        this._renderAtSea(snap.atSea);
    }

    static _splitShips(snapshot) {
        const processing = [];
        const lines = [];

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

    static _renderProcessing(processing) {
        const el = this.processingList;
        if (!el) return;

        const seen = new Set();
        for (const s of processing) seen.add(s.id);
        for (const child of [...el.children]) {
            if (child.classList && child.classList.contains("ship-card")) {
                const sid = child.dataset.shipId;
                if (!seen.has(sid)) el.removeChild(child);
            }
        }

        if (processing.length === 0) return;

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

    static _renderAtSea(atSea) {
        if (!this.atSeaList) return;
        if (atSea.length === 0) {
            this.atSeaList.innerHTML = "";
            return;
        }
        this.atSeaList.innerHTML = atSea
            .map((s) => {
                const label = s.priorityLabel || "Unknown";
                return `<span class="chip at-sea-chip" data-ship-id="${s.id}" data-priority="${s.priority}">`
                    + `<span class="at-sea-id">${this._esc(s.id)}</span>`
                    + `<span class="at-sea-name">${this._esc(s.name || "")}</span>`
                    + `<span class="at-sea-label">${this._esc(label)}</span>`
                    + `</span>`;
            })
            .join("");
    }

    static _esc(str) {
        return String(str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
        })[c]);
    }

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
}