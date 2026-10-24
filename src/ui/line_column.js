// One line column UI (Part 9.2).
// Renders/updates the ships inside a line column while reusing existing
// card elements via the shared shipMap (Part 9.6 update strategy).
//
// Accepts ONLY plain snapshot objects (Part 10.2). No structures/domain import.

import { ShipCard } from "./ship_card.js";

export class LineColumn {
    // O(1) — creates the column skeleton for a given line id
    static create(lineId) {
        const col = document.createElement("section");
        col.className = "line-column";
        col.dataset.lineId = String(lineId);

        col.innerHTML = `
      <header class="line-header">
        <span class="line-title">LINE ${lineId}</span>
        <span class="line-count">0 / 8</span>
      </header>
      <div class="ships-container"></div>
    `;

        return col;
    }

    // O(n) — n = ships in this line
    // lineSnapshot = { id, ships: [shipSnap, ...] }  (Part 10.2 shape)
    // shipMap      = Map<shipId, HTMLElement> shared across columns
    static render(col, lineSnapshot, shipMap) {
        const shipsContainer = col.querySelector(".ships-container");
        const countLabel = col.querySelector(".line-count");

        countLabel.textContent = `${lineSnapshot.ships.length} / 8`;

        const seen = new Set();

        // Walk through ships in the priority order the engine gave us.
        // Create new cards once; reuse existing DOM thereafter.
        let anchor = shipsContainer.firstChild;
        for (const ship of lineSnapshot.ships) {
            seen.add(ship.id);

            let card = shipMap.get(ship.id);
            if (!card) {
                card = ShipCard.create(ship);
                shipMap.set(ship.id, card);
            } else {
                ShipCard.update(card, ship);
            }

            if (card !== anchor) {
                shipsContainer.insertBefore(card, anchor);
            } else {
                anchor = anchor.nextSibling;
            }
        }

        // Remove cards that no longer belong to this line
        for (const [shipId, card] of shipMap) {
            if (!seen.has(shipId) && card.parentNode === shipsContainer) {
                shipsContainer.removeChild(card);
            }
        }

        // Empty state
        const existingEmpty = shipsContainer.querySelector(".line-empty");
        if (lineSnapshot.ships.length === 0) {
            if (!existingEmpty) {
                const empty = document.createElement("div");
                empty.className = "line-empty";
                empty.textContent = "— empty —";
                shipsContainer.appendChild(empty);
            }
        } else if (existingEmpty) {
            shipsContainer.removeChild(existingEmpty);
        }
    }
}