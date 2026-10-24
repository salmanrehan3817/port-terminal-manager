// Ship card UI (Part 9.3).
// Renders a single ship's card. Update strategy (Part 9.6): mutate fields
// in place — do NOT rebuild the whole card on every tick.
//
// Accepts ONLY plain snapshot objects (Part 10.2 shape). No structures/domain import.

export class ShipCard {
    // O(1) — creates a new card element for a ship snapshot
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
        <div class="ship-container hidden">Container: <span class="container-id"></span></div>
      `;

        ShipCard.update(card, ship);
        return card;
    }

    // O(1) — updates an existing card from a ship snapshot
    static update(card, ship) {
        card.dataset.state = ship.state;
        card.dataset.priority = String(ship.priority);

        card.querySelector(".ship-id").textContent = ship.id;
        card.querySelector(".ship-name").textContent = ship.name;
        card.querySelector(".priority-badge").textContent = ship.priorityLabel;

        card.querySelector(".ship-capacity").textContent =
            `Capacity: ${ship.used} / ${ship.capacity}`;
        card.querySelector(".ship-state").textContent = ship.state;

        const progressRow = card.querySelector(".ship-progress");
        const containerRow = card.querySelector(".ship-container");
        const hasProgress = ship.state === "loading" || ship.state === "unloading";

        if (hasProgress) {
            progressRow.classList.remove("hidden");
            containerRow.classList.remove("hidden");

            const pct = Math.round((ship.progress || 0) * 100);
            card.querySelector(".progress-fill").style.width = pct + "%";
            card.querySelector(".progress-text").textContent = pct + "%";
            card.querySelector(".container-id").textContent =
                ship.activeContainerId || "—";
        } else {
            progressRow.classList.add("hidden");
            containerRow.classList.add("hidden");
        }
    }
}