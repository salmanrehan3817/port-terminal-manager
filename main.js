import { Engine } from "./src/engine/engine.js";
import { Renderer } from "./src/ui/renderer.js";
import { ShipForm } from "./src/ui/ship_form.js";
import { ContainerForm } from "./src/ui/container_form.js";
import { DetailModal } from "./src/ui/detail_model.js";
// ============================================================
// Engine + UI wiring (Part 10.3 lifecycle)
// ============================================================

const engine = new Engine();

// --- Demo seed data (so the UI shows something on first load) ---
// Not required by the spec — only to visualize the layout. Delete if undesired.
(function seedDemo() {
    // engine.addShip("S1", "Alpha", 10, -1);   // Emergency
    // engine.addShip("S2", "Bravo", 11, 1);   // High
    // engine.addShip("S3", "Charlie", 12, 2);   // Normal
    // engine.addShip("S4", "Delta", 13, 2);   // Normal
    // engine.addShip("S5", "Echo", 14, 4);   // Very low

    engine.addContainer("C1", 20, "A");
    engine.addContainer("C2", 15, "B");
    // engine.addContainer("C3", 8, "C");
    // engine.addContainer("C4", 12, "A");

    engine.addRoute("A", "B");
    engine.addRoute("B", "C");

    engine.shipArrives("S1");
    engine.shipArrives("S2");
    engine.shipArrives("S3");
    engine.shipArrives("S4");
    engine.shipArrives("S5");
})();

// --- UI lifecycle ---
Renderer.init(engine);
ShipForm.init(engine);
ContainerForm.init(engine);
DetailModal.init(engine);
Renderer.renderAll(engine.getSnapshot());
Renderer.subscribe(engine.bus);

// --- Toolbar wiring ---
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const speedSelect = document.getElementById("speedSelect");

startBtn.addEventListener("click", () => engine.start());
stopBtn.addEventListener("click", () => engine.stop());
speedSelect.addEventListener("change", () => {
    const v = parseFloat(speedSelect.value);
    if (!engine.setSpeed(v)) console.warn("Invalid speed:", v);
});