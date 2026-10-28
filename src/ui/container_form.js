// Add Container form (extra feature — not in original spec).
// UI only calls engine.addContainer(). No structures/domain imports.

export class ContainerForm {
    // O(1) — cache elements, wire submit + toggle
    static init(engine) {
        this.engine = engine;
        this.form = document.getElementById("addContainerForm");

        if (!this.form) {
            console.warn("Add Container form not found in DOM — skipping.");
            return;
        }

        this.statusEl = document.getElementById("addContainerStatus");
        this.toggleBtn = document.getElementById("toggleAddContainer");

        this.form.addEventListener("submit", (ev) => {
            ev.preventDefault();
            this._onSubmit();
        });

        if (this.toggleBtn) {
            this.toggleBtn.addEventListener("click", () => {
                this.form.classList.toggle("hidden-form");
                this.toggleBtn.textContent = this.form.classList.contains("hidden-form")
                    ? "+"
                    : "−";
            });
        }
    }

    // O(1) — validate, then call engine.addContainer
    static _onSubmit() {
        const idEl = document.getElementById("containerIdInput");
        const wEl = document.getElementById("containerWeightInput");
        const dEl = document.getElementById("containerDestInput");

        if (!idEl || !wEl || !dEl) {
            console.error("Container form fields missing");
            return;
        }

        const id = idEl.value.trim();
        const weight = Number(wEl.value);
        const dest = dEl.value.trim();

        // --- Validation ---
        if (!id) { this._show("Container Name required", "error"); idEl.focus(); return; }
        if (!dest) { this._show("Destination required", "error"); dEl.focus(); return; }
        if (!Number.isFinite(weight) || weight <= 0) {
            this._show("Weight must be > 0", "error");
            return;
        }

        // --- Engine call ---
        const ok = this.engine.addContainer(id, weight, dest);
        if (!ok) {
            this._show(`Container "${id}" rejected — duplicate ID`, "error");
            return;
        }

        this._show(`Container "${id}" added to yard → ${dest}`, "ok");

        // Reset for next entry (keep sensible defaults)
        this.form.reset();
        document.getElementById("containerWeightInput").value = "10";
        document.getElementById("containerDestInput").value = "A";
        idEl.focus();
    }

    // O(1) — status message with auto-clear
    static _show(message, type) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
        this.statusEl.dataset.status = type;
        clearTimeout(this._statusTimer);
        this._statusTimer = setTimeout(() => {
            this.statusEl.textContent = "";
            this.statusEl.dataset.status = "";
        }, 3000);
    }
}