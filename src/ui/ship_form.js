// Add Ship form (extra feature — not in original spec).
// UI only calls engine action methods (addShip + shipArrives).
// No structures/domain imports (Part 9.7 / Part 15 import rules preserved).

export class ShipForm {
    // O(1) — cache elements, wire submit + toggle
    static init(engine) {
        this.engine = engine;
        this.form = document.getElementById("addShipForm");

        if (!this.form) {
            console.warn("Add Ship form not found in DOM — skipping.");
            return;
        }

        this.statusEl = document.getElementById("addShipStatus");
        this.toggleBtn = document.getElementById("toggleAddShip");

        this.form.addEventListener("submit", (ev) => {
            ev.preventDefault();
            this._onSubmit();
        });

        this.toggleBtn.addEventListener("click", () => {
            this.form.classList.toggle("hidden-form");
            this.toggleBtn.textContent = this.form.classList.contains("hidden-form")
                ? "+"
                : "−";
        });
    }

    // O(1) — validate, then call engine.addShip + shipArrives / shipArrivesOnLine
    static _onSubmit() {
        const idEl = document.getElementById("shipIdInput");
        const nameEl = document.getElementById("shipNameInput");
        const arrivalEl = document.getElementById("shipArrivalInput");
        const priorityEl = document.getElementById("shipPrioritySelect");
        const capEl = document.getElementById("shipCapacityInput");
        const lineEl = document.getElementById("shipLineSelect");

        const id = idEl.value.trim();
        const name = nameEl.value.trim();
        const arrival = Number(arrivalEl.value);
        const priority = Number(priorityEl.value);
        const capacity = Number(capEl.value);
        const lineChoice = lineEl.value; // "auto" or "1".."4"

        // --- Validation ---
        if (!id) { this._show("Ship ID required", "error"); idEl.focus(); return; }
        if (!name) { this._show("Name required", "error"); nameEl.focus(); return; }
        if (!Number.isFinite(arrival)) { this._show("Arrival must be a number", "error"); return; }
        if (!Number.isFinite(capacity) || capacity <= 0) {
            this._show("Capacity must be > 0", "error"); return;
        }
        if (priority < -1 || priority > 5) {
            this._show("Priority must be -1..5", "error"); return;
        }

        // --- Engine call #1: create ship ---
        const created = this.engine.addShip(id, name, arrival, priority, capacity);
        if (!created) {
            this._show(`Ship "${id}" rejected — duplicate ID or invalid priority`, "error");
            return;
        }

        // --- Engine call #2: arrive on chosen line (or auto) ---
        let arrivedOk;
        if (lineChoice === "auto") {
            this.engine.shipArrives(id);
            arrivedOk = true;
        } else {
            arrivedOk = this.engine.shipArrivesOnLine(id, Number(lineChoice));
        }

        if (!arrivedOk && lineChoice !== "auto") {
            this._show(
                `Ship "${id}" created but Line ${lineChoice} is FULL — sent to at-sea queue`,
                "error"
            );
        } else {
            const label = lineChoice === "auto" ? "auto" : `Line ${lineChoice}`;
            this._show(`Ship "${id}" created → ${label}`, "ok");
        }

        // --- Reset form for next entry ---
        this.form.reset();
        document.getElementById("shipArrivalInput").value = String(arrival + 1);
        document.getElementById("shipCapacityInput").value = "10";
        document.getElementById("shipPrioritySelect").value = "2";
        document.getElementById("shipLineSelect").value = "auto";
        idEl.focus();
    }

    // O(1) — status message with auto-clear
    static _show(message, type) {
        this.statusEl.textContent = message;
        this.statusEl.dataset.status = type;
        clearTimeout(this._statusTimer);
        this._statusTimer = setTimeout(() => {
            this.statusEl.textContent = "";
            this.statusEl.dataset.status = "";
        }, 3000);
    }
}