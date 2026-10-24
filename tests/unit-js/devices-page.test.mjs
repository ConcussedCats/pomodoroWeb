import assert from "node:assert/strict";
import test from "node:test";

import {
    addHook,
    baseContext,
    createFetch,
    createLiveChannel,
    createPageDocument,
    createStorageSpy,
    createTimers,
    flush,
    jsonResponse,
    runPageScripts
} from "./page-dom.test-utils.mjs";

const SERVICE = "7e1a0001-5c1e-4c3a-9f2e-6b7d0c0f1a00";
const INFO = "7e1a0002-5c1e-4c3a-9f2e-6b7d0c0f1a00";
const PROVISIONING = "7e1a0003-5c1e-4c3a-9f2e-6b7d0c0f1a00";
const STATUS = "7e1a0004-5c1e-4c3a-9f2e-6b7d0c0f1a00";
const CONTROL = "7e1a0005-5c1e-4c3a-9f2e-6b7d0c0f1a00";

const onlineCube = {
    id: 1,
    hardwareId: "A1B2C3D4E5F6",
    name: "Desk cube",
    status: "ONLINE",
    firmwareVersion: "0.1.0",
    lastSeenAt: Date.now() - 30_000,
    capabilities: { vibration: true, sound: true },
    metrics: { wifiRssi: -60 },
    settingsApplied: true
};

const offlineCube = {
    id: 2,
    hardwareId: "FFEEDDCCBBAA",
    name: "Old cube",
    status: "OFFLINE",
    firmwareVersion: null,
    lastSeenAt: null,
    capabilities: {},
    metrics: {},
    settingsApplied: false
};

function settingsOf(device, overrides = {}) {
    return {
        deviceId: device.id,
        vibrationEnabled: true,
        soundEnabled: true,
        rgbBrightness: 60,
        updatedAt: 1,
        appliedOnDevice: true,
        capabilities: device.capabilities,
        ...overrides
    };
}

function encode(value) {
    return new TextEncoder().encode(JSON.stringify(value));
}

function decode(bytes) {
    return JSON.parse(new TextDecoder().decode(bytes));
}

function createFakeBluetooth({ info = { hardwareId: "A1B2C3D4E5F6", provisioned: false }, requestError, onProvision } = {}) {
    const record = { writes: [], requestOptions: null, statusListener: null, disconnected: false };
    const characteristics = {
        [INFO]: { readValue: async () => encode(info) },
        [PROVISIONING]: {
            writeValueWithResponse: async (bytes) => {
                record.writes.push(decode(bytes));
                onProvision?.(record);
            }
        },
        [STATUS]: {
            addEventListener: (type, listener) => {
                record.statusListener = listener;
            },
            removeEventListener: () => {},
            startNotifications: async () => {},
            stopNotifications: async () => {},
            readValue: async () => encode({ state: "IDLE", errorCode: null })
        },
        [CONTROL]: {
            writeValueWithResponse: async (bytes) => record.writes.push(decode(bytes))
        }
    };
    const server = {
        getPrimaryService: async (uuid) => {
            assert.equal(uuid, SERVICE);
            return { getCharacteristic: async id => characteristics[id] };
        }
    };
    const device = {
        gatt: {
            connected: true,
            connect: async () => server,
            disconnect: () => {
                record.disconnected = true;
            }
        },
        addEventListener: () => {}
    };
    record.notify = (status) => record.statusListener({ target: { value: encode(status) } });
    record.bluetooth = {
        requestDevice: async (options) => {
            record.requestOptions = options;
            if (requestError) {
                const error = new Error("browser error");
                error.name = requestError;
                throw error;
            }
            return device;
        }
    };
    return record;
}

function buildDevicesPage(document) {
    const main = addHook(document, document.body, "main");
    addHook(document, main, "meta").content = "";
    addHook(document, main, "button", { "data-add-device": "" });
    addHook(document, main, "p", { "data-page-message": "", class: "form-message hidden" });
    addHook(document, main, "div", { "data-devices-list": "" });
    addHook(document, main, "p", { "data-empty-state": "" });
    const wizard = addHook(document, main, "section", { "data-wizard": "", class: "device-wizard hidden" });
    addHook(document, wizard, "button", { "data-wizard-close": "" });
    addHook(document, wizard, "h2", { "data-wizard-title": "" });
    addHook(document, wizard, "div", { "data-wizard-content": "" });
    addHook(document, wizard, "p", { "data-wizard-message": "", class: "form-message hidden" });
    addHook(document, wizard, "div", { "data-wizard-actions": "" });
}

function setupPage({ devices = [onlineCube], settings = {}, routes, bluetooth, secure = true, confirm = () => true } = {}) {
    const document = createPageDocument();
    buildDevicesPage(document);
    const csrfMeta = { content: "csrf-token" };
    const csrfHeaderMeta = { content: "X-CSRF-TOKEN" };
    const originalQuery = document.querySelector;
    document.querySelector = (selector) => {
        if (selector === 'meta[name="_csrf"]') return csrfMeta;
        if (selector === 'meta[name="_csrf_header"]') return csrfHeaderMeta;
        return originalQuery(selector);
    };

    const live = createLiveChannel();
    const timers = createTimers();
    const localStorage = createStorageSpy();
    const http = createFetch(async (url, options) => {
        const custom = routes ? await routes(url, options) : undefined;
        if (custom) return custom;
        const method = options.method || "GET";
        if (url === "/api/devices" && method === "GET") return jsonResponse(devices);
        const settingsMatch = url.match(/^\/api\/devices\/(\d+)\/settings$/);
        if (settingsMatch && method === "GET") {
            const device = devices.find(item => String(item.id) === settingsMatch[1]);
            return jsonResponse(settingsOf(device, settings[device.id]));
        }
        return undefined;
    });

    const context = baseContext(document, {
        fetch: http.fetch,
        TelosDeviceLive: live,
        localStorage,
        confirm,
        isSecureContext: secure,
        navigator: bluetooth ? { bluetooth: bluetooth.bluetooth } : {},
        setInterval: timers.setInterval,
        clearInterval: timers.clearInterval,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout
    });
    runPageScripts(context, ["ble-provisioning.js", "devices.js"]);

    const $ = selector => document.querySelector(selector);
    const cards = () => $("[data-devices-list]").querySelectorAll("article");
    const buttonByText = (root, text) => root.querySelectorAll("button").find(button => button.textContent === text);
    return { document, context, live, timers, http, localStorage, $, cards, buttonByText };
}

// ------------------------------------------------------------- device list

test("device list shows name, status, firmware, last seen and only reported metrics", async () => {
    const page = setupPage({ devices: [onlineCube, offlineCube] });
    await flush();

    const [first, second] = page.cards();
    assert.equal(page.cards().length, 2);
    assert.equal(first.querySelector("h2").textContent, "Desk cube");
    assert.equal(first.querySelector(".device-badge").textContent, "ONLINE");
    assert.match(first.textContent, /Firmware 0\.1\.0/);
    assert.match(first.textContent, /Last seen: Just now/);
    assert.match(first.textContent, /Wi-Fi -60 dBm/);

    assert.equal(second.querySelector(".device-badge").textContent, "OFFLINE");
    assert.ok(second.querySelector(".device-badge").classList.contains("device-badge--offline"));
    assert.match(second.textContent, /Firmware not reported/);
    assert.match(second.textContent, /Never seen/);
    assert.equal(second.querySelectorAll(".device-metric").length, 0);
    assert.doesNotMatch(first.textContent + second.textContent, /battery/i);
    assert.match(first.textContent, /Hardware ID: A1B2C3D4E5F6/);
    assert.ok(page.$("[data-empty-state]").classList.contains("hidden"));
});

test("empty account shows the empty state", async () => {
    const page = setupPage({ devices: [] });
    await flush();
    assert.equal(page.cards().length, 0);
    assert.equal(page.$("[data-empty-state]").classList.contains("hidden"), false);
});

test("device names are rendered as text, never as markup", async () => {
    const page = setupPage({ devices: [{ ...onlineCube, name: "<img src=x onerror=alert(1)>" }] });
    await flush();
    const title = page.cards()[0].querySelector("h2");
    assert.equal(title.textContent, "<img src=x onerror=alert(1)>");
    assert.equal(title.children.length, 0);
});

test("rename sends PATCH with JSON body and CSRF header", async () => {
    const page = setupPage({
        routes: (url, options) => (url === "/api/devices/1" && options.method === "PATCH"
            ? jsonResponse({ ...onlineCube, name: "Kitchen cube" })
            : undefined)
    });
    await flush();

    const form = page.cards()[0].querySelector("form.device-rename");
    form.querySelector("input").value = "  Kitchen cube ";
    form.dispatchEvent({ type: "submit" });
    await flush();

    const call = page.http.calls.find(item => item.options.method === "PATCH");
    assert.equal(call.url, "/api/devices/1");
    assert.deepEqual(call.body, { name: "Kitchen cube" });
    assert.equal(call.options.headers["X-CSRF-TOKEN"], "csrf-token");
    assert.equal(call.options.headers["Content-Type"], "application/json");
    assert.equal(page.cards()[0].querySelector("h2").textContent, "Kitchen cube");
});

test("unbind asks for confirmation and only then sends DELETE", async () => {
    let answer = false;
    const page = setupPage({
        confirm: () => answer,
        routes: (url, options) => (url === "/api/devices/1" && options.method === "DELETE"
            ? jsonResponse(undefined, 204)
            : undefined)
    });
    await flush();

    page.buttonByText(page.cards()[0], "Unbind device").click();
    await flush();
    assert.equal(page.http.calls.some(item => item.options.method === "DELETE"), false);
    assert.equal(page.cards().length, 1);

    answer = true;
    page.buttonByText(page.cards()[0], "Unbind device").click();
    await flush();
    const call = page.http.calls.find(item => item.options.method === "DELETE");
    assert.equal(call.options.headers["X-CSRF-TOKEN"], "csrf-token");
    assert.equal(page.cards().length, 0);
    assert.match(page.$("[data-page-message]").textContent, /Re-pair/);
});

test("settings are saved with PUT and show waiting until the cube applies them", async () => {
    const page = setupPage({
        routes: (url, options) => (url === "/api/devices/1/settings" && options.method === "PUT"
            ? jsonResponse(settingsOf(onlineCube, { vibrationEnabled: false, rgbBrightness: 30, appliedOnDevice: false }))
            : undefined)
    });
    await flush();

    const form = page.cards()[0].querySelector("form.device-settings");
    form.elements.vibrationEnabled.checked = false;
    form.elements.rgbBrightness.value = "30";
    form.dispatchEvent({ type: "submit" });
    await flush();

    const call = page.http.calls.find(item => item.options.method === "PUT");
    assert.deepEqual(call.body, { vibrationEnabled: false, soundEnabled: true, rgbBrightness: 30 });
    assert.equal(call.options.headers["X-CSRF-TOKEN"], "csrf-token");
    assert.equal(page.$("[data-page-message]").textContent, "Saved, waiting for cube.");

    page.live.emit({
        type: "SETTINGS",
        deviceId: 1,
        settings: settingsOf(onlineCube, { vibrationEnabled: false, rgbBrightness: 30, appliedOnDevice: true })
    });
    assert.equal(page.cards()[0].querySelector("form.device-settings").elements.rgbBrightness.value, "30");
});

test("settings without a confirmed capability are marked as not confirmed by firmware", async () => {
    const page = setupPage({ devices: [{ ...onlineCube, capabilities: { vibration: true } }] });
    await flush();
    const notes = page.cards()[0].querySelectorAll(".device-unconfirmed");
    // sound and rgb are not confirmed, vibration is.
    assert.equal(notes.length, 2);
    notes.forEach(note => assert.equal(note.textContent, "not confirmed by firmware"));
});

// ------------------------------------------------------------- live updates

test("live DEVICE_STATUS flips the badge and DEVICE_REMOVED removes the card", async () => {
    const page = setupPage();
    await flush();

    page.live.emit({ type: "DEVICE_STATUS", deviceId: 1, status: "OFFLINE", lastSeenAt: Date.now() });
    assert.equal(page.cards()[0].querySelector(".device-badge").textContent, "OFFLINE");

    page.live.emit({ type: "DEVICE_REMOVED", deviceId: 1 });
    assert.equal(page.cards().length, 0);
});

test("heartbeat updates do not wipe a name the user is typing", async () => {
    const page = setupPage();
    await flush();

    const input = page.cards()[0].querySelector("form.device-rename").querySelector("input");
    input.focus();
    input.value = "Half typed";
    page.live.emit({ type: "DEVICE_UPDATED", deviceId: 1, device: { ...onlineCube, metrics: { wifiRssi: -70 } } });
    assert.equal(page.cards()[0].querySelector("form.device-rename").querySelector("input").value, "Half typed");

    input.blur();
    assert.match(page.cards()[0].textContent, /Wi-Fi -70 dBm/);
});

test("RESYNC reloads the device list from the server", async () => {
    const page = setupPage();
    await flush();
    const before = page.http.calls.filter(call => call.url === "/api/devices").length;
    page.live.emit({ type: "RESYNC" });
    await flush();
    assert.equal(page.http.calls.filter(call => call.url === "/api/devices").length, before + 1);
});

// ------------------------------------------------------------- pairing wizard

test("wizard explains unsupported browsers instead of offering Bluetooth", async () => {
    const page = setupPage();
    await flush();
    page.$("[data-add-device]").click();
    assert.match(page.$("[data-wizard-content]").textContent, /Chrome, Edge, and Opera/);
    assert.equal(page.buttonByText(page.$("[data-wizard-actions]"), "Choose cube"), undefined);
});

test("wizard requires a secure context", async () => {
    const page = setupPage({ bluetooth: createFakeBluetooth(), secure: false });
    await flush();
    page.$("[data-add-device]").click();
    assert.match(page.$("[data-wizard-content]").textContent, /HTTPS or localhost/);
});

async function goToWifiStep(page) {
    page.$("[data-add-device]").click();
    page.buttonByText(page.$("[data-wizard-actions]"), "Choose cube").click();
    await flush();
}

function pairingRoutes(statusSequence) {
    let polls = 0;
    return (url, options) => {
        if (url === "/api/device-pairings" && options.method === "POST") {
            return jsonResponse({ pairingId: 5, pairingToken: "token-abc", status: "CREATED", expiresAt: Date.now() + 300_000 }, 201);
        }
        if (url === "/api/device-pairings/5") {
            const status = statusSequence[Math.min(polls, statusSequence.length - 1)];
            polls += 1;
            return jsonResponse({ pairingId: 5, status, expiresAt: Date.now() + 300_000, deviceId: 9, deviceName: "New cube" });
        }
        return undefined;
    };
}

test("happy path: pairing token and Wi-Fi go to the cube, success after the server sees the claim", async () => {
    const bluetooth = createFakeBluetooth();
    const page = setupPage({ bluetooth, routes: pairingRoutes(["CREATED", "CLAIMED"]) });
    await flush();
    await goToWifiStep(page);

    assert.equal(JSON.stringify(bluetooth.requestOptions), JSON.stringify({ filters: [{ services: [SERVICE] }] }));
    const [ssid, password] = page.$("[data-wizard-content]").querySelectorAll("input");
    assert.equal(password.type, "password");
    ssid.value = "HomeWiFi";
    password.value = "super-secret";
    page.buttonByText(page.$("[data-wizard-actions]"), "Send to cube").click();
    await flush();

    assert.deepEqual({ ...bluetooth.writes[0] }, {
        v: 1,
        ssid: "HomeWiFi",
        password: "super-secret",
        pairingToken: "token-abc",
        apiBaseUrl: "https://teclos.example"
    });
    assert.equal(page.http.calls.some(call => JSON.stringify(call).includes("super-secret")), false);
    assert.equal(page.localStorage.writes.length, 0);
    assert.equal(password.value, "");

    bluetooth.notify({ state: "WIFI_CONNECTING", errorCode: null });
    assert.match(page.$("[data-wizard-content]").textContent, /WIFI_CONNECTING/);

    await page.timers.runIntervals();
    await flush();
    assert.notEqual(page.$("[data-wizard-title]").textContent, "Cube paired");
    await page.timers.runIntervals();
    await flush();
    assert.equal(page.$("[data-wizard-title]").textContent, "Cube paired");
    assert.match(page.$("[data-wizard-content]").textContent, /New cube is ready/);
    assert.equal(bluetooth.disconnected, true);
});

test("expired pairing shows an error and retrying creates a new pairing", async () => {
    const bluetooth = createFakeBluetooth();
    const page = setupPage({ bluetooth, routes: pairingRoutes(["EXPIRED"]) });
    await flush();
    await goToWifiStep(page);
    const [ssid, password] = page.$("[data-wizard-content]").querySelectorAll("input");
    ssid.value = "HomeWiFi";
    password.value = "pw";
    page.buttonByText(page.$("[data-wizard-actions]"), "Send to cube").click();
    await flush();
    await page.timers.runIntervals();
    await flush();

    assert.match(page.$("[data-wizard-content]").textContent, /token expired/);
    assert.equal(page.timers.activeCount(), 0);

    page.buttonByText(page.$("[data-wizard-actions]"), "Try again").click();
    page.buttonByText(page.$("[data-wizard-actions]"), "Choose cube").click();
    await flush();
    const inputs = page.$("[data-wizard-content]").querySelectorAll("input");
    inputs[0].value = "HomeWiFi";
    inputs[1].value = "pw";
    page.buttonByText(page.$("[data-wizard-actions]"), "Send to cube").click();
    await flush();
    const created = page.http.calls.filter(call => call.url === "/api/device-pairings" && call.options.method === "POST");
    assert.equal(created.length, 2);
});

test("a cube owned by another account gets a specific message", async () => {
    const bluetooth = createFakeBluetooth();
    const page = setupPage({ bluetooth, routes: pairingRoutes(["CREATED"]) });
    await flush();
    await goToWifiStep(page);
    const [ssid] = page.$("[data-wizard-content]").querySelectorAll("input");
    ssid.value = "HomeWiFi";
    page.buttonByText(page.$("[data-wizard-actions]"), "Send to cube").click();
    await flush();

    bluetooth.notify({ state: "PAIRING_FAILED", errorCode: "DEVICE_OWNED_BY_ANOTHER_USER" });
    assert.match(page.$("[data-wizard-content]").textContent, /belongs to another account/);
});

test("Wi-Fi failure reported by the cube is shown", async () => {
    const bluetooth = createFakeBluetooth();
    const page = setupPage({ bluetooth, routes: pairingRoutes(["CREATED"]) });
    await flush();
    await goToWifiStep(page);
    page.buttonByText(page.$("[data-wizard-actions]"), "Send to cube").click();
    await flush();

    bluetooth.notify({ state: "WIFI_FAILED", errorCode: "WIFI_AUTH_FAILED" });
    assert.match(page.$("[data-wizard-content]").textContent, /password was rejected/);
});

test("denied Bluetooth permission and a closed chooser are explained", async () => {
    for (const [name, text] of [["NotAllowedError", /permission was denied/], ["NotFoundError", /No cube was selected/]]) {
        const page = setupPage({ bluetooth: createFakeBluetooth({ requestError: name }) });
        await flush();
        await goToWifiStep(page);
        assert.match(page.$("[data-wizard-content]").textContent, text);
    }
});

test("an already provisioned cube is not paired again", async () => {
    const page = setupPage({ bluetooth: createFakeBluetooth({ info: { hardwareId: "X", provisioned: true } }) });
    await flush();
    await goToWifiStep(page);
    assert.match(page.$("[data-wizard-content]").textContent, /already provisioned/);
});

test("closing the wizard stops pairing polls and the token countdown", async () => {
    const bluetooth = createFakeBluetooth();
    const page = setupPage({ bluetooth, routes: pairingRoutes(["CREATED"]) });
    await flush();
    await goToWifiStep(page);
    page.buttonByText(page.$("[data-wizard-actions]"), "Send to cube").click();
    await flush();
    assert.ok(page.timers.activeCount() >= 2);

    page.$("[data-wizard-close]").click();
    assert.equal(page.timers.activeCount(), 0);
    assert.ok(page.$("[data-wizard]").classList.contains("hidden"));
});
