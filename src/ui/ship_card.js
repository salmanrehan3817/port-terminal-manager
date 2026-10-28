export class ShipCard {
  static create(ship) {
    const card = document.createElement("article");
    card.className = "ship-card";
    card.dataset.shipId = ship.id;
    card.innerHTML = `
      <div class="ship-header">
        <span class="ship-id"></span>
        <span class="ship-name"></span>
        <span class="priority-badge"></span>
      </div>
      <div class="ship-meta">
        <span class="ship-capacity"></span>
        <span class="ship-state"></span>
      </div>
      <div class="ship-progress hidden">
        <div class="progress-bar"><div class="progress-fill" style="width:0%"></div></div>
        <span class="progress-text">0%</span>
      </div>
      <div class="ship-container hidden">
        <span class="container-label">Loading:</span>
        <span class="container-id">—</span>
      </div>
      <div class="ship-loaded hidden"></div>
    `;
    ShipCard.update(card, ship);
    return card;
  }

  static update(card, ship) {
    card.dataset.state = ship.state;
    card.dataset.priority = String(ship.priority);

    card.querySelector(".ship-id").textContent = ship.id;
    card.querySelector(".ship-name").textContent = ship.name;
    card.querySelector(".priority-badge").textContent = ship.priorityLabel;

    const isFinished = (ship.progress || 0) >= 0.99;

    const stateLabels = {
      atSea: "at sea", waitingAtSea: "waiting (at sea)",
      waiting: "waiting", docked: "docked", loading: "loading",
      unloading: "unloading", ready: "ready", processing: "processing",
      departing: "departing", departed: "departed",
    };

    const displayState = (isFinished && ship.state === "loading") ? "processing" : ship.state;
    card.querySelector(".ship-state").textContent = stateLabels[displayState] || displayState;

    const progressRow = card.querySelector(".ship-progress");
    const containerRow = card.querySelector(".ship-container");
    const showProgress = (ship.state === "loading" || ship.state === "unloading") && !isFinished;

    if (showProgress) {
      progressRow.classList.remove("hidden");
      containerRow.classList.remove("hidden");
      const pct = Math.round((ship.progress || 0) * 100);
      card.querySelector(".progress-fill").style.width = pct + "%";
      card.querySelector(".progress-text").textContent = pct + "%";
      card.querySelector(".container-id").textContent = ship.activeContainerId || "—";
      card.querySelector(".container-label").textContent =
        ship.state === "loading" ? "Loading:" : "Unloading:";
    } else {
      progressRow.classList.add("hidden");
      containerRow.classList.add("hidden");
    }

    const loadedRow = card.querySelector(".ship-loaded");
    let containers = [...(ship.containers || [])];

    if (isFinished && ship.activeContainerId && !containers.includes(ship.activeContainerId)) {
      containers.push(ship.activeContainerId);
    }

    // 👇 DYNAMIC COUNT: Hamesha actual chips ya engine count mein se jo bada ho
    const totalLoaded = Math.max(ship.used || 0, containers.length);

    card.querySelector(".ship-capacity").textContent =
      `Loaded: ${totalLoaded} / ${ship.capacity}`;

    if (containers.length > 0 || showProgress) {
      loadedRow.classList.remove("hidden");
      const loadedChips = containers
        .map((cid) => `<span class="loaded-chip">✓ ${cid}</span>`)
        .join("");
      const activeChip = showProgress
        ? `<span class="loading-chip">⏳ ${ship.activeContainerId || "—"}</span>`
        : "";
      loadedRow.innerHTML = loadedChips + activeChip;
    } else {
      loadedRow.classList.add("hidden");
    }
  }
}