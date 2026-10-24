import { test } from "node:test";
import assert from "node:assert";
import { Engine } from "../src/engine/engine.js";
import { EventBus } from "../src/engine/event_bus.js";

// ----- EventBus -----

test("EventBus on/emit/off", () => {
    const bus = new EventBus();
    let calls = 0;
    const cb = () => { calls++; };
    bus.on("x", cb);
    bus.emit("x");
    assert.strictEqual(calls, 1);
    bus.off("x", cb);
    bus.emit("x");
    assert.strictEqual(calls, 1);
});

test("EventBus passes payload", () => {
    const bus = new EventBus();
    let received = null;
    bus.on("x", (p) => { received = p; });
    bus.emit("x", { a: 1 });
    assert.deepStrictEqual(received, { a: 1 });
});

test("EventBus ignores unknown events", () => {
    const bus = new EventBus();
    bus.emit("nope"); // no throw
});

// ----- Engine basics -----

test("Engine constructor defaults", () => {
    const e = new Engine();
    assert.strictEqual(e.speed, 1);
    assert.strictEqual(e.running, false);
    assert.strictEqual(e.tickMs, 100);
    assert.ok(e.port);
    assert.ok(e.bus);
});

test("setSpeed accepts {0.5,1,2,4}, rejects others", () => {
    const e = new Engine();
    assert.strictEqual(e.setSpeed(0.5), true);
    assert.strictEqual(e.speed, 0.5);
    assert.strictEqual(e.setSpeed(2), true);
    assert.strictEqual(e.speed, 2);
    assert.strictEqual(e.setSpeed(4), true);
    assert.strictEqual(e.setSpeed(3), false);
    assert.strictEqual(e.speed, 4);
    assert.strictEqual(e.setSpeed(0), false);
});

test("start/stop toggles running flag", () => {
    const e = new Engine();
    e.start();
    assert.strictEqual(e.running, true);
    e.stop();
    assert.strictEqual(e.running, false);
});

test("getSnapshot delegates to port", () => {
    const e = new Engine();
    const snap = e.getSnapshot();
    assert.strictEqual(snap.lines.length, 4);
    assert.ok(Array.isArray(snap.atSea));
});

// ----- T6 — no preemption during loading -----

test("T6 — no preemption: active loading ship is not interrupted", () => {
    const e = new Engine();
    e.addShip("N1", "N1", 10);
    e.shipArrives("N1");
    e.addContainer("C1", 20, "A");
    e.startLoading("N1", "C1");
    e.tick(); // 100ms elapsed, N1 is loading

    e.addShip("E1", "E1", 10, -1);
    e.shipArrives("E1");

    // E1 → line 2 (lines 2,3,4 empty; lowest ID wins). L1 still has N1.
    const snap = e.getSnapshot();
    assert.strictEqual(snap.lines[1].ships[0].id, "E1");
    // N1 must still be loading — no preemption
    const n1 = e.port.ships.get("N1");
    assert.strictEqual(n1.status, "loading");
});

// ----- T7 — progress simulation -----

test("T7 — 2000ms loading; progress ≈ 0.5 at 1000ms", () => {
    const e = new Engine();
    e.addShip("S1", "S1", 10);
    e.shipArrives("S1");
    e.addContainer("C1", 20, "A");
    e.startLoading("S1", "C1");

    // 10 ticks × 100ms = 1000ms
    for (let i = 0; i < 10; i++) e.tick();
    const ship = e.port.ships.get("S1");
    assert.ok(ship.progress >= 0.49 && ship.progress <= 0.51);
    assert.strictEqual(ship.status, "loading");

    // 10 more ticks = 2000ms total → complete
    for (let i = 0; i < 10; i++) e.tick();
    assert.strictEqual(ship.status, "ready");
    assert.strictEqual(ship.containerCount(), 1);
    const c = e.port.containers.get("C1");
    assert.strictEqual(c.status, "onShip");
    assert.strictEqual(c.shipId, "S1");
});

// ----- T8 — depart rejected during loading -----

test("T8 — depart rejected while loading", () => {
    const e = new Engine();
    e.addShip("S1", "S1", 10);
    e.shipArrives("S1");
    e.addContainer("C1", 20, "A");
    e.startLoading("S1", "C1");
    assert.strictEqual(e.depart("S1"), false);
});

// ----- T12 — undo unload -----

test("T12 — undoUnload restores container to ship", () => {
    const e = new Engine();
    e.addShip("S1", "S1", 10);
    e.shipArrives("S1");
    e.addContainer("C1", 20, "A");
    e.startLoading("S1", "C1");

    for (let i = 0; i < 20; i++) e.tick();
    assert.strictEqual(e.port.ships.get("S1").containerCount(), 1);

    e.startUnloading("S1");
    for (let i = 0; i < 20; i++) e.tick();
    assert.strictEqual(e.port.ships.get("S1").containerCount(), 0);
    assert.strictEqual(e.port.yard.has("C1"), true);

    assert.strictEqual(e.undoUnload(), true);
    assert.strictEqual(e.port.ships.get("S1").containerCount(), 1);
    assert.strictEqual(e.port.yard.has("C1"), false);
});

test("undoUnload on empty stack returns false", () => {
    const e = new Engine();
    assert.strictEqual(e.undoUnload(), false);
});

// ----- T10 — engine files contain no DOM references -----

test("T10 — engine files do not reference DOM", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const engineDir = path.join(__dirname, "..", "src", "engine");
    const actualFiles = fs.readdirSync(engineDir);

    const files = ["engine.js", "port.js", "event_bus.js"];
    for (const f of files) {
        const fullPath = path.join(engineDir, f);
        if (!fs.existsSync(fullPath)) {
            throw new Error(
                `Missing: ${f}. Engine folder contains: ${actualFiles.join(", ")}`
            );
        }
        const content = fs.readFileSync(fullPath, "utf-8");
        assert.ok(!content.includes("document."), `${f} references document`);
        assert.ok(!content.includes("window."), `${f} references window`);
        assert.ok(!content.includes("HTMLElement"), `${f} references HTMLElement`);
    }
});
// ----- Event emissions (Part 8.3) -----

test("Event: data:updated emitted on addShip/addContainer/addRoute", () => {
    const e = new Engine();
    const kinds = [];
    e.bus.on("data:updated", (p) => kinds.push(p.kind));
    e.addShip("S1", "Alpha", 10);
    e.addContainer("C1", 20, "A");
    e.addRoute("A", "B");
    assert.deepStrictEqual(kinds, ["ship", "container", "route"]);
});

test("Events: ship:arrived + ship:docked fired on arrival", () => {
    const e = new Engine();
    const events = [];
    e.bus.on("ship:arrived", (p) => events.push(["arrived", p.shipId, p.lineId]));
    e.bus.on("ship:docked", (p) => events.push(["docked", p.shipId, p.lineId]));
    e.addShip("S1", "Alpha", 10);
    e.shipArrives("S1");
    assert.deepStrictEqual(events, [["arrived", "S1", 1], ["docked", "S1", 1]]);
});

test("Event: ship:overflown on full-port arrival (T4)", () => {
    const e = new Engine();
    for (let i = 1; i <= 32; i++) {
        e.addShip(`N${i}`, `N${i}`, 10);
        e.shipArrives(`N${i}`);
    }
    const overflown = [];
    e.bus.on("ship:overflown", (p) => overflown.push(p.shipId));
    e.addShip("N33", "N33", 10);
    e.shipArrives("N33");
    assert.deepStrictEqual(overflown, ["N33"]);
});

test("Events: loadingStarted / progress / loadingFinished", () => {
    const e = new Engine();
    const events = [];
    e.bus.on("ship:loadingStarted", (p) => events.push(["started", p.containerId]));
    e.bus.on("ship:progress", (p) => events.push(["progress", p.progress]));
    e.bus.on("ship:loadingFinished", (p) => events.push(["finished", p.containerId]));

    e.addShip("S1", "S1", 10);
    e.shipArrives("S1");
    e.addContainer("C1", 20, "A");
    e.startLoading("S1", "C1");

    for (let i = 0; i < 20; i++) e.tick();

    assert.strictEqual(events[0][0], "started");
    assert.strictEqual(events[0][1], "C1");
    const finished = events.find((ev) => ev[0] === "finished");
    assert.deepStrictEqual(finished, ["finished", "C1"]);
    assert.ok(events.filter((ev) => ev[0] === "progress").length > 0);
});

test("Events: ship:departed on depart", () => {
    const e = new Engine();
    const departed = [];
    e.bus.on("ship:departed", (p) => departed.push([p.shipId, p.lineId]));
    e.addShip("S1", "S1", 10);
    e.shipArrives("S1");
    e.depart("S1");
    assert.deepStrictEqual(departed, [["S1", 1]]);
});

test("Event: line:updated emitted on line state change", () => {
    const e = new Engine();
    let count = 0;
    e.bus.on("line:updated", () => count++);
    e.addShip("S1", "S1", 10);
    e.shipArrives("S1");
    assert.ok(count >= 1);
});

test("Event: engine:tick emitted each tick", () => {
    const e = new Engine();
    const times = [];
    e.bus.on("engine:tick", (p) => times.push(p.simTime));
    e.tick();
    e.tick();
    assert.deepStrictEqual(times, [100, 200]);
});

test("Speed multiplies simTime per tick", () => {
    const e = new Engine();
    e.setSpeed(2);
    e.tick(); // 100 × 2 = 200
    assert.strictEqual(e.port.simTime, 200);
});