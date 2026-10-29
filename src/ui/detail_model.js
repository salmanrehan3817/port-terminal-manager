// Detail modal — shows ship or container details on click.
// Includes a History timeline section.

export class DetailModal {
  static init(engine) {
    this.engine = engine;
    this.overlay = document.getElementById("detailModal");
    this.titleEl = document.getElementById("modalTitle");
    this.bodyEl = document.getElementById("modalBody");
    this.closeBtn = document.getElementById("modalClose");

    if (!this.overlay) {
      console.warn("Detail modal not found in DOM — skipping.");
      return;
    }

    this.overlay.addEventListener("click", (ev) => {
      if (ev.target === this.overlay) this.close();
    });
    this.closeBtn.addEventListener("click", () => this.close());
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !this.overlay.classList.contains("hidden")) this.close();
    });
  }

  static close() { this.overlay.classList.add("hidden"); }

  static showShip(shipId) {
    const ship = this.engine.port.ships.get(shipId);
    if (!ship) return;

    const lineId = ship.currentLineId;
    const containers = ship.listContainers();
    const totalWeight = containers.reduce((sum, cid) => {
      const c = this.engine.port.containers.get(cid);
      return sum + (c ? c.weight : 0);
    }, 0);
    const history = ship.history || [];

    this.titleEl.textContent = `Ship · ${this._esc(ship.id)}`;

    const labels = { "-1": "Emergency", "0": "Critical", "1": "High", "2": "Normal", "3": "Low", "4": "Very low", "5": "Bulk" };
    const priorityLabel = labels[String(ship.priority)] || "Unknown";

    this.bodyEl.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Identity</div>
        <div class="detail-row"><span class="detail-label">Ship ID</span><span class="detail-value accent">${this._esc(ship.id)}</span></div>
        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${this._esc(ship.name)}</span></div>
        <div class="detail-row"><span class="detail-label">Priority</span><span class="detail-value"><span class="detail-badge" data-priority="${ship.priority}">${priorityLabel}</span></span></div>
        <div class="detail-row"><span class="detail-label">Arrival</span><span class="detail-value">${ship.arrival}</span></div>
        
        <!-- 🚨 NEW: From Port & To Port -->
        <div class="detail-row"><span class="detail-label">From Port</span><span class="detail-value">${this._esc(ship.originPort || "N/A")}</span></div>
        <div class="detail-row"><span class="detail-label">To Port</span><span class="detail-value">${this._esc(ship.destinationPort || "N/A")}</span></div>
        
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Status</div>
        <div class="detail-row"><span class="detail-label">State</span><span class="detail-value">${this._esc(ship.status)}</span></div>
        <div class="detail-row"><span class="detail-label">Line</span><span class="detail-value">${lineId ? "Line " + lineId : "— (at sea / processing)"}</span></div>
        ${ship.status === "loading" || ship.status === "unloading" ? `
        <div class="detail-row"><span class="detail-label">Active Container</span><span class="detail-value accent">${this._esc(ship.activeContainerId || "—")}</span></div>
        <div class="detail-row"><span class="detail-label">Progress</span><span class="detail-value">${Math.round((ship.progress || 0) * 100)}%</span></div>` : ""}
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Cargo</div>
        <div class="detail-row"><span class="detail-label">Capacity</span><span class="detail-value">${ship.containerCount()} / ${ship.capacity}</span></div>
        <div class="detail-row"><span class="detail-label">Total Weight</span><span class="detail-value">${totalWeight}</span></div>
        ${containers.length === 0
        ? `<div class="detail-empty">No containers on board.</div>`
        : `<div class="detail-container-list">${containers.map((cid) => `<span class="detail-container-chip">${this._esc(cid)}</span>`).join("")}</div>`}
      </div>

      ${this._renderHistory(history)}
    `;

    this.overlay.classList.remove("hidden");
  }

  static showContainer(containerId) {
    const c = this.engine.port.containers.get(containerId);
    if (!c) return;

    const ship = c.shipId ? this.engine.port.ships.get(c.shipId) : null;
    const history = c.history || [];

    this.titleEl.textContent = `Container · ${this._esc(c.id)}`;

    this.bodyEl.innerHTML = `
      <div class="detail-section">
        <div class="detail-section-title">Identity</div>
        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value accent">${this._esc(c.id)}</span></div>
        <div class="detail-row"><span class="detail-label">Weight</span><span class="detail-value">${c.weight}</span></div>
        <div class="detail-row"><span class="detail-label">Destination</span><span class="detail-value">${this._esc(c.dest)}</span></div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Location</div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${this._esc(c.status)}</span></div>
        
        <!-- Sirf tab Ship show karein jab container ship par ho -->
        ${ship ? `
        <div class="detail-row">
          <span class="detail-label">Ship</span>
          <span class="detail-value">${this._esc(ship.id)} (${this._esc(ship.name)})</span>
        </div>` : ""}
        
      </div>

      ${this._renderHistory(history)}
    `;

    this.overlay.classList.remove("hidden");
  }

  // O(n) — render history timeline
  static _renderHistory(history) {
    if (!history || history.length === 0) {
      return `
      <div class="detail-section">
        <div class="detail-section-title">History</div>
        <div class="detail-empty">No history yet.</div>
      </div>`;
    }
    const rows = history.map((h) =>
      `<div class="timeline-row">
        <span class="timeline-time">${Math.round(h.time)}ms</span>
        <span class="timeline-action">${this._esc(h.action)}</span>
        <span class="timeline-info">${this._esc(h.info || "")}</span>
      </div>`).join("");
    return `
      <div class="detail-section">
        <div class="detail-section-title">History (${history.length})</div>
        <div class="detail-timeline">${rows}</div>
      </div>`;
  }

  static _esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }
}