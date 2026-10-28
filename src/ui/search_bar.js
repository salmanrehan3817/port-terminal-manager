// Trie-backed prefix search (Part 9.4).
// Click a result → opens DetailModal (ship or container).

import { DetailModal } from "./detail_model.js";

export class SearchBar {
    static init(engine, inputEl, resultsEl) {
        this.engine = engine;
        this.inputEl = inputEl;
        this.resultsEl = resultsEl;

        if (!this.inputEl || !this.resultsEl) {
            console.error("SearchBar: missing DOM elements");
            return;
        }

        this.inputEl.addEventListener("input", () => this._onInput());
        this.inputEl.addEventListener("focus", () => {
            if (this.inputEl.value.trim()) this._onInput();
        });
        this.inputEl.addEventListener("blur", () => {
            setTimeout(() => this._hide(), 200);
        });
        this.inputEl.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape") this._hide();
        });

        // Click on a result item → open detail modal
        this.resultsEl.addEventListener("mousedown", (ev) => {
            const item = ev.target.closest(".result-item");
            if (!item) return;
            const type = item.dataset.resultType;
            const id = item.dataset.resultId;
            if (type === "ship") {
                DetailModal.showShip(id);
            } else if (type === "container") {
                DetailModal.showContainer(id);
            }
            this.inputEl.value = "";
            this._hide();
        });
    }

    static _onInput() {
        const prefix = this.inputEl.value.trim();
        if (!prefix) { this._hide(); return; }

        const containers = this.engine.searchContainersByPrefix(prefix) || [];
        const ships = this.engine.searchShipsByPrefix(prefix) || [];

        if (containers.length === 0 && ships.length === 0) {
            this._hide();
            return;
        }

        const parts = [];
        if (containers.length) {
            parts.push(`<div class="group-label">Containers (${containers.length})</div>`);
            for (const id of containers) {
                parts.push(`<div class="result-item" data-result-type="container" data-result-id="${this._escape(id)}">${this._escape(id)}</div>`);
            }
        }
        if (ships.length) {
            parts.push(`<div class="group-label">Ships (${ships.length})</div>`);
            for (const id of ships) {
                parts.push(`<div class="result-item" data-result-type="ship" data-result-id="${this._escape(id)}">${this._escape(id)}</div>`);
            }
        }

        this.resultsEl.innerHTML = parts.join("");
        this.resultsEl.classList.remove("hidden");
    }

    static _hide() {
        if (!this.resultsEl) return;
        this.resultsEl.classList.add("hidden");
    }

    static _escape(str) {
        return String(str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
        })[c]);
    }
}