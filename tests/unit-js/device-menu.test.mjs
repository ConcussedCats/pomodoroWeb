import assert from "node:assert/strict";
import test from "node:test";

import {
    addHook,
    baseContext,
    createFetch,
    createLiveChannel,
    createPageDocument,
    flush,
    jsonResponse,
    runPageScripts
} from "./page-dom.test-utils.mjs";
import { createLocalStorage } from "./timer-state.test-utils.mjs";

const cube = {
    id: 3,
    name: "Desk cube",
    status: "OFFLINE",
    lastSeenAt: Date.now() - 120_000,
    capabilities: { vibration: true }
};

const cubeSettings = {
    deviceId: 3,
    vibrationEnabled: true,
    soundEnabled: false,
    rgbBrightness: 40,
    appliedOnDevice: true,
    capabilities: { vibration: true }
};

function buildMenu(document) {
    const menu = addHook(document, document.body, "details", { "data-device-menu": "", class: "account-menu device-menu" });
    addHook(document, menu, "span", { "data-device-menu-label": "" });
    addHook(document, menu, "span", { "data-device-menu-status": "", class: "hidden" });
    addHook(document, menu, "span", { "data-device-menu-count": "" });
    addHook(document, menu, "div", { "data-device-menu-sources": "" });
    addHook(document, menu, "p", { "data-device-menu-sync": "", class: "hidden" });
    const controls = addHook(document, menu, "div", { "data-device-menu-controls": "", class: "hidden" });
    addHook(document, controls, "p", { "data-device-menu-controls-title": "" });
    const range = addHook(document, controls, "input", { "data-device-menu-brightness": "" });
    range.type = "range";
    addHook(document, controls, "span", { "data-device-menu-brightness-value": "" });
    const vibration = addHook(document, controls, "input", { "data-device-menu-vibration": "" });
    vibration.type = "checkbox";
    const sound = addHook(document, controls, "input", { "data-device-menu-sound": "" });
    sound.type = "checkbox";
    addHook(document, controls, "p", { "data-device-menu-note": "" });
    return menu;
}

function setup({ activeId = null, connectedTimer, devices = [cube] } = {}) {
    const document = createPageDocument();
    const menu = buildMenu(document);
    const originalQuery = document.querySelector;
    document.querySelector = (selector) => {
        if (selector === 'meta[name="_csrf"]') return { content: "csrf-token" };
        if (selector === 'meta[name="_csrf_header"]') return { content: "X-CSRF-TOKEN" };
        return originalQuery(selector);
    };

    const http = createFetch((url, options) => {
        if (url === "/api/devices") return jsonResponse(devices);
        if (url === "/api/devices/3/settings" && (options.method || "GET") === "GET") return jsonResponse(cubeSettings);
        if (url === "/api/devices/3/settings" && options.method === "PUT") {
            return jsonResponse({ ...cubeSettings, ...JSON.parse(options.body), appliedOnDevice: false });
        }
        return undefined;
    });

    const localStorage = createLocalStorage(activeId ? { telosActiveDeviceId: String(activeId) } : {});
    const location = { href: "/productivity", origin: "https://teclos.example" };
    const context = baseContext(document, {
        fetch: http.fetch,
        localStorage,
        location,
        TelosDeviceLive: createLiveChannel(),
        TelosConnectedTimer: connectedTimer,
        setTimeout: (callback) => {
            callback();
            return 1;
        },
        clearTimeout: () => {},
        addEventListener: () => {},
        CustomEvent: class {
            constructor(type, init = {}) {
                this.type = type;
                this.detail = init.detail;
            }
        }
    });
    runPageScripts(context, ["timer-state.js", "connected-state.js", "device-menu.js"]);
    const $ = selector => menu.querySelector(selector);
    const source = value => menu.querySelectorAll("button").find(button => button.dataset.source === value);
    return { document, menu, http, location, $, source, context };
}

test("menu lists this browser and the cubes with their status", async () => {
    const page = setup();
    await flush();
    const names = page.$("[data-device-menu-sources]").querySelectorAll(".device-menu__source-name")
        .map(node => node.textContent);
    assert.deepEqual(names, ["This browser", "Desk cube"]);
    assert.match(page.source("3").textContent, /Offline · seen 2m ago/);
    assert.equal(page.source("browser").getAttribute("aria-pressed"), "true");
    assert.equal(page.$("[data-device-menu-label]").textContent, "Browser");
    assert.equal(page.$("[data-device-menu-count]").textContent, "1 cube");
});

test("active online cube is marked in the menu", async () => {
    const page = setup({ activeId: 3, devices: [{ ...cube, status: "ONLINE" }] });
    await flush();
    assert.equal(page.source("3").getAttribute("aria-pressed"), "true");
    assert.equal(page.$("[data-device-menu-label]").textContent, "Cube");
    assert.equal(page.$("[data-device-menu-status]").textContent, "Online");
    assert.equal(page.$("[data-device-menu-sync]").textContent, "The timer runs on your cube.");
});

test("an offline cube hands its last phase to the browser timer instead of blocking it", async () => {
    const endsAt = Date.now() + 600_000;
    const page = setup({ activeId: 3 });
    page.context.localStorage.setItem("telosConnectedSnapshot", JSON.stringify({
        offsetMs: 0,
        state: {
            deviceId: 3, mode: "WORK", webMode: "pomodoro", status: "RUNNING", durationSeconds: 1500,
            remainingSeconds: 1500, endsAt, cycleIndex: 0, phaseIndex: 0, version: 4
        }
    }));
    await flush();

    assert.equal(page.context.localStorage.getItem("telosActiveDeviceId"), null);
    assert.equal(page.$("[data-device-menu-label]").textContent, "Browser");
    assert.equal(page.source("browser").getAttribute("aria-pressed"), "true");
    assert.match(page.$("[data-device-menu-sync]").textContent, /continues in this browser/);
    const browser = JSON.parse(page.context.localStorage.getItem("pomodoroTimerState"));
    assert.equal(browser.isRunning, true);
    assert.equal(browser.endTime, endsAt);
});

test("on other pages choosing a cube opens the timer page with the source", async () => {
    const page = setup();
    await flush();
    page.source("3").click();
    assert.equal(page.location.href, "/?timerSource=3");
});

test("on the timer page choosing a source switches it in place", async () => {
    const calls = [];
    const page = setup({
        activeId: 3,
        connectedTimer: { isActive: () => true, select: target => calls.push(target), getStatus: () => ({}) }
    });
    await flush();
    page.source("browser").click();
    assert.deepEqual(calls, [null]);
    assert.equal(page.location.href, "/productivity");
});

test("quick settings show the cube values and save with the CSRF header", async () => {
    const page = setup({ activeId: 3, devices: [{ ...cube, status: "ONLINE" }] });
    await flush();
    assert.equal(page.$("[data-device-menu-controls]").classList.contains("hidden"), false);
    assert.equal(page.$("[data-device-menu-brightness]").value, "40");
    assert.equal(page.$("[data-device-menu-sound]").checked, false);
    assert.match(page.$("[data-device-menu-note]").textContent, /Not confirmed by firmware: RGB, sound/);

    page.$("[data-device-menu-brightness]").value = "70";
    page.$("[data-device-menu-brightness]").dispatchEvent({ type: "input" });
    await flush();

    const put = page.http.calls.find(call => call.options.method === "PUT");
    assert.deepEqual(put.body, { vibrationEnabled: true, soundEnabled: false, rgbBrightness: 70 });
    assert.equal(put.options.headers["X-CSRF-TOKEN"], "csrf-token");
    assert.match(page.$("[data-device-menu-note]").textContent, /Saved, waiting for the cube/);
});

test("timer page status is shown in the menu", async () => {
    const page = setup({
        connectedTimer: { isActive: () => true, select: () => {}, getStatus: () => ({}) }
    });
    await flush();
    page.document.dispatchEvent({
        type: "connected:status",
        detail: {
            active: true,
            deviceId: 3,
            devices: [{ ...cube, status: "ONLINE" }],
            syncText: "Waiting for the cube to confirm…",
            syncTone: "pending",
            pending: true
        }
    });
    assert.equal(page.$("[data-device-menu-sync]").textContent, "Waiting for the cube to confirm…");
    assert.equal(page.menu.dataset.pending, "true");
    assert.equal(page.$("[data-device-menu-status]").textContent, "Online");
});

test("device names are text, never markup", async () => {
    const page = setup({ devices: [{ ...cube, name: "<b>bold</b>" }] });
    await flush();
    const name = page.source("3").querySelector(".device-menu__source-name");
    assert.equal(name.textContent, "<b>bold</b>");
    assert.equal(name.children.length, 0);
});
