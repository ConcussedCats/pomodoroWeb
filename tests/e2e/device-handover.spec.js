// Browser <-> cube handover against a LOCAL server with the software ESP32 emulator
// (docs/esp32/PROTOCOL.md 1.4 and 1.6). Skipped for remote targets: it registers a user and pairs a cube.
//
//   E2E_BASE_URL=http://localhost:8080 npx playwright test tests/e2e/device-handover.spec.js
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { test, expect } = require("@playwright/test");

const baseUrl = process.env.E2E_BASE_URL || "";
const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl);

async function loadEmulator() {
    const root = path.resolve(__dirname, "../../tools/esp32-emulator");
    const { CubeState } = await import(pathToFileURL(path.join(root, "cube-state.mjs")).href);
    const { DeviceClient, MemoryStorage } = await import(pathToFileURL(path.join(root, "device-client.mjs")).href);
    return { CubeState, DeviceClient, MemoryStorage };
}

/** Runs the emulated cube like the firmware loop: tick, events, commands, heartbeat. */
function startCubeLoop(client, cube) {
    let lastHeartbeat = 0;
    let busy = false;
    const timer = setInterval(async () => {
        if (busy) return;
        busy = true;
        try {
            cube.tick();
            if (cube.getEvents().length) await client.flushEvents();
            await client.pollCommands();
            if (Date.now() - lastHeartbeat > 10_000) {
                lastHeartbeat = Date.now();
                await client.heartbeat({ pollPending: false });
            }
        } finally {
            busy = false;
        }
    }, 400);
    return () => clearInterval(timer);
}

async function browserTimer(page) {
    return page.evaluate(() => JSON.parse(localStorage.getItem("pomodoroTimerState")));
}

test.describe.serial("browser and cube behave as one timer", () => {
    test.skip(!isLocal, "Needs a local server (E2E_BASE_URL=http://localhost:8080)");

    let page;
    let cube;
    let client;
    let stopCube;
    let deviceId;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        const name = `handover${Date.now().toString(36)}`;
        await page.goto(`${baseUrl}/register`);
        const inputs = page.locator("form input:not([type=hidden])");
        await inputs.nth(0).fill(name);
        await inputs.nth(1).fill(`${name}@local.test`);
        await inputs.nth(2).fill("Handover-test-1");
        await inputs.nth(3).fill("Handover-test-1");
        await page.locator("form button[type=submit]").click();
        await page.waitForURL(url => !url.pathname.startsWith("/register"));

        await page.goto(`${baseUrl}/`);
        const token = await page.evaluate(async () => {
            const header = document.querySelector('meta[name="_csrf_header"]').content;
            const csrf = document.querySelector('meta[name="_csrf"]').content;
            const response = await fetch("/api/device-pairings", { method: "POST", headers: { [header]: csrf } });
            return (await response.json()).pairingToken;
        });

        const { CubeState, DeviceClient, MemoryStorage } = await loadEmulator();
        cube = new CubeState();
        client = new DeviceClient({ hardwareId: `E2E${Date.now()}`, apiBaseUrl: baseUrl, storage: new MemoryStorage(), cube });
        deviceId = (await client.pair(token)).deviceId;
        await client.heartbeat();
        await client.fetchConfig();
        stopCube = startCubeLoop(client, cube);

        await page.reload();
        await expect(page.locator("#deviceBar")).toBeVisible();
    });

    test.afterAll(async () => {
        stopCube?.();
        await page?.close();
    });

    test("browser phase continues on the cube with the same end", async () => {
        await page.locator("#startBtn").click();
        await expect(page.locator("#startBtn .btn-text")).toHaveText("PAUSE FLOW");
        await page.waitForTimeout(1500);
        const before = await browserTimer(page);

        await page.locator("#timerSource").selectOption(String(deviceId));
        await expect(page.locator("#deviceSync")).toHaveText("The browser phase continues on the cube.", { timeout: 15_000 });

        expect(cube.state.status).toBe("RUNNING");
        expect(Math.abs(cube.state.localEndsAt - before.endTime)).toBeLessThan(100);
        expect((await browserTimer(page)).isRunning).toBe(false);
    });

    test("cube phase continues in the browser with the same end", async () => {
        const cubeEnd = cube.state.localEndsAt;
        await page.locator("#timerSource").selectOption("");

        await expect.poll(async () => (await browserTimer(page)).isRunning, { timeout: 15_000 }).toBe(true);
        const after = await browserTimer(page);
        expect(Math.abs(after.endTime - cubeEnd)).toBeLessThan(100);
        expect(cube.state.status).toBe("STOPPED");
        await expect(page.locator("#startBtn .btn-text")).toHaveText("PAUSE FLOW");
    });

    test("flipping the cube takes over from the browser timer", async () => {
        const browserSession = await page.evaluate(() => JSON.parse(localStorage.getItem("telosSessionTracker")).id);

        cube.applyFace("SHORT_BREAK");
        await client.flushEvents();

        await expect(page.locator("#timerSource")).toHaveValue(String(deviceId), { timeout: 10_000 });
        await expect(page.locator(".mode-label--active")).toHaveAttribute("data-mode", "short-break");
        expect((await browserTimer(page)).isRunning).toBe(false);

        // The browser part of the handed back phase is closed in history, the cube break is open.
        await expect.poll(async () => page.evaluate(async (id) => {
            const response = await fetch("/api/pomodoro-sessions?page=0&size=10");
            const items = (await response.json()).items;
            return items.find(item => item.externalId === id)?.status;
        }, browserSession), { timeout: 10_000 }).toBe("INTERRUPTED");
    });
});
