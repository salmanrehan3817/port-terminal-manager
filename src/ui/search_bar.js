// Trie-backed prefix search (Part 9.4).
// On every keystroke calls engine.searchContainersByPrefix + engine.searchShipsByPrefix.
// No engine events — synchronous calls.

export class SearchBar {
    // O(1) — cache elements + wire input events
    static init(engine, inputEl, resultsEl) {
        this.engine = engine;
        this.inputEl = inputEl;
        this.resultsEl = resultsEl;

        this.inputEl.addEventListener("input", () => this._onInput());
        this.inputEl.addEventListener("focus", () => {
            if (this.inputEl.value.trim()) this._onInput();
        });
        this.inputEl.addEventListener("blur", () => {
            // Delay so a click on a result still registers
            setTimeout(() => this._hide(), 150);
        });
        this.inputEl.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape") this._hide();
        });
    }

    // O(p + k) — prefix lookups in both tries
    static _onInput() {
        const prefix = this.inputEl.value.trim();
        if (!prefix) {
            this._hide();
            return;
        }

        const containers = this.engine.searchContainersByPrefix(prefix);
        const ships = this.engine.searchShipsByPrefix(prefix);

        if (containers.length === 0 && ships.length === 0) {
            this._hide();
            return;
        }

        const parts = [];
        if (containers.length) {
            parts.push(`<div class="group-label">Containers (${containers.length})</div>`);
            for (const id of containers) {
                parts.push(`<div class="result-item">${this._escape(id)}</div>`);
            }
        }
        if (ships.length) {
            parts.push(`<div class="group-label">Ships (${ships.length})</div>`);
            for (const id of ships) {
                parts.push(`<div class="result-item">${this._escape(id)}</div>`);
            }
        }

        this.resultsEl.innerHTML = parts.join("");
        this.resultsEl.classList.remove("hidden");
    }

    // O(1)
    static _hide() {
        this.resultsEl.classList.add("hidden");
    }

    // O(n)
    static _escape(str) {
        return String(str).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
        })[c]);
    }
}