import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import { createLocalStorage } from "./timer-state.test-utils.mjs";

function loadModules({ fetchImpl } = {}) {
    const localStorage = createLocalStorage();
    const requests = [];
    const context = {
        console: { warn() {}, log() {}, error() {} },
        localStorage,
        Date,
        Math,
        JSON,
        Number,
        String,
        Boolean,
        Object,
        Array,
        Intl,
        Error,
        Promise,
        crypto: { randomUUID: () => `uuid-${requests.length}-${Math.random().toString(16).slice(2, 8)}` },
        document: {
            addEventListener() {},
            querySelector(selector) {
                if (selector === 'meta[name="_csrf"]') return { content: "csrf-token" };
                if (selector === 'meta[name="_csrf_header"]') return { content: "X-CSRF-TOKEN" };
                return null;
            }
        },
        fetch: async (url, options = {}) => {
            requests.push({ url, options });
            return fetchImpl ? fetchImpl(url, options) : { ok: true, status: 200, text: async () => "{}" };
        }
    };
    context.window = context;
    vm.createContext(context);

    for (const file of ["timer-state.js", "connected-state.js", "session-recorder.js"]) {
        const filePath = path.resolve("src/main/resources/static/js", file);
        vm.runInContext(readFileSync(filePath, "utf8"), context, { filename: filePath });
    }

    return {
        timerState: context.PomodoroTimerState,
        connected: context.TelosConnectedState,
        recorder: context.TelosSessionRecorder,
        localStorage,
        requests
    };
}

function jsonResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

const runningState = {
    deviceId: 7,
    mode: "WORK",
    webMode: "pomodoro",
    status: "RUNNING",
    durationSeconds: 1500,
    remainingSeconds: 1500,
    startedAt: 1_000_000,
    endsAt: 1_000_000 + 1_500_000,
    version: 3,
    cycleIndex: 0,
    totalCycles: 4,
    filledDots: 1,
    workPhasesPerCycle: 4,
    serverTime: 1_000_000
};

// ------------------------------------------------------------- connected-state.js

test("connected countdown is computed locally from endsAt and the server clock offset", () => {
    const { connected } = loadModules();
    assert.equal(connected.getRemainingSeconds(runningState, 0, 1_000_000), 1500);
    assert.equal(connected.getRemainingSeconds(runningState, 0, 1_000_000 + 60_000), 1440);
    // Local clock 5 s behind the server.
    assert.equal(connected.getRemainingSeconds(runningState, 5_000, 1_000_000 + 60_000), 1435);
    assert.equal(connected.getRemainingSeconds(runningState, 0, 9_999_999_999), 0);
});

test("paused, stopped and finished states never count down", () => {
    const { connected } = loadModules();
    const paused = { ...runningState, status: "PAUSED", remainingSeconds: 900, endsAt: null };
    assert.equal(connected.getRemainingSeconds(paused, 0, 9_000_000), 900);
    assert.equal(connected.getRemainingSeconds({ ...runningState, status: "FINISHED", remainingSeconds: 0 }, 0, 0), 0);
    assert.equal(connected.getRemainingSeconds({ ...runningState, status: "STOPPED", endsAt: null }, 0, 9_000_000), 1500);
});

test("clock offset comes from serverTime of the response", () => {
    const { connected } = loadModules();
    assert.equal(connected.computeClockOffset({ serverTime: 10_500 }, 10_000), 500);
    assert.equal(connected.computeClockOffset({}, 10_000), 0);
});

test("only newer versions replace the shown state", () => {
    const { connected } = loadModules();
    assert.equal(connected.isNewer({ ...runningState, version: 4 }, runningState), true);
    assert.equal(connected.isNewer({ ...runningState, version: 3 }, runningState), false);
    assert.equal(connected.isNewer({ ...runningState, version: 2 }, runningState), false);
    assert.equal(connected.isNewer({ ...runningState, deviceId: 8, version: 1 }, runningState), true);
    assert.equal(connected.isNewer(runningState, null), true);
});

test("server modes map to the existing browser mode names", () => {
    const { connected } = loadModules();
    assert.equal(connected.webModeOf("WORK"), "pomodoro");
    assert.equal(connected.webModeOf("SHORT_BREAK"), "short-break");
    assert.equal(connected.webModeOf("LONG_BREAK"), "long-break");
});

test("view model shows next phase and completion like the browser timer", () => {
    const { connected } = loadModules();
    const finished = {
        ...runningState,
        status: "FINISHED",
        remainingSeconds: 0,
        endsAt: null,
        suggestedNextMode: "SHORT_BREAK",
        cycleIndex: 1
    };
    const view = connected.toView(finished, 0, 0);
    assert.equal(view.webMode, "pomodoro");
    assert.equal(view.label, "Focus done");
    assert.equal(view.suggestedNextWebMode, "short-break");
    assert.equal(view.progress, 1);
    assert.equal(view.cycleNumber, 2);
    assert.equal(view.statusText, "Finished");

    const done = connected.toView({ ...finished, sessionCompleted: true }, 0, 0);
    assert.equal(done.label, "Session Complete");
    assert.equal(done.statusText, "Completed");
});

test("leaving Connected Mode clears the device selection and its snapshot", () => {
    const { connected, localStorage } = loadModules();
    assert.equal(connected.setActiveDeviceId(7), 7);
    connected.saveSnapshot(runningState, 120);
    assert.equal(connected.getActiveDeviceId(), 7);
    assert.equal(connected.loadSnapshot(7).offsetMs, 120);
    assert.equal(connected.loadSnapshot(8), null);

    connected.setActiveDeviceId(null);
    assert.equal(connected.getActiveDeviceId(), null);
    assert.equal(localStorage.getItem(connected.keys.SNAPSHOT_KEY), null);
    assert.equal(connected.setActiveDeviceId("not-a-number"), null);
});

test("commands are sent with CSRF header, server mode and a client request id", async () => {
    const { connected, requests } = loadModules({
        fetchImpl: () => jsonResponse({ commandId: "c1", status: "PENDING" }, 202)
    });
    const command = await connected.sendCommand(7, "START", "WORK");
    assert.equal(command.status, "PENDING");
    assert.equal(requests[0].url, "/api/devices/7/commands");
    assert.equal(requests[0].options.method, "POST");
    assert.equal(requests[0].options.headers["X-CSRF-TOKEN"], "csrf-token");
    const body = JSON.parse(requests[0].options.body);
    assert.equal(body.type, "START");
    assert.equal(body.mode, "WORK");
    assert.ok(body.clientRequestId);
});

test("offline device errors keep the server error code", async () => {
    const { connected } = loadModules({
        fetchImpl: () => jsonResponse({ errorCode: "DEVICE_OFFLINE", message: "The cube is offline" }, 409)
    });
    await assert.rejects(connected.sendCommand(7, "PAUSE"), (error) => {
        assert.equal(error.status, 409);
        assert.equal(error.code, "DEVICE_OFFLINE");
        return true;
    });
});

// ------------------------------------------------------------- session-recorder.js

function startedBrowserTimer(timerState, now) {
    const settings = timerState.getDefaultSettings();
    const state = timerState.startTimerState(timerState.getDefaultTimerState(settings), settings, now);
    return { settings, state };
}

test("starting the browser timer opens a tracker for the phase", () => {
    const { timerState, recorder } = loadModules();
    const now = 1_000_000;
    const { settings, state } = startedBrowserTimer(timerState, now);

    const result = recorder.observe(null, state, settings, timerState, now);
    assert.equal(result.record, null);
    assert.equal(result.tracker.mode, "pomodoro");
    assert.equal(result.tracker.plannedSeconds, 1500);
    assert.equal(result.tracker.startedAt, now);
});

test("a phase that runs out is recorded as COMPLETED with the planned duration", () => {
    const { timerState, recorder } = loadModules();
    const now = 1_000_000;
    const { settings, state } = startedBrowserTimer(timerState, now);
    const tracker = recorder.observe(null, state, settings, timerState, now).tracker;

    const later = now + 1_500_000 + 500;
    const next = timerState.hydrateTimerState(state, settings, later);
    assert.equal(next.currentMode, "short-break");

    const result = recorder.observe(tracker, next, settings, timerState, later);
    assert.equal(result.record.status, "COMPLETED");
    assert.equal(result.record.type, "WORK");
    assert.equal(result.record.actualDurationSeconds, 1500);
    assert.equal(result.record.finishedAt, now + 1_500_000);
    assert.equal(result.record.externalId, tracker.id);
    assert.equal(result.tracker.mode, "short-break");
});

test("reset after ten minutes records an INTERRUPTED session", () => {
    const { timerState, recorder } = loadModules();
    const now = 1_000_000;
    const { settings, state } = startedBrowserTimer(timerState, now);
    let tracker = recorder.observe(null, state, settings, timerState, now).tracker;

    const pauseAt = now + 600_000;
    const paused = timerState.pauseTimerState(state, settings, pauseAt);
    tracker = recorder.observe(tracker, paused, settings, timerState, pauseAt).tracker;

    const reset = timerState.resetTimerState(paused, settings);
    const result = recorder.observe(tracker, reset, settings, timerState, pauseAt + 5_000);
    assert.equal(result.record.status, "INTERRUPTED");
    assert.equal(result.record.actualDurationSeconds, 600);
    assert.equal(result.tracker, null);
});

test("quick mode clicks shorter than a minute are not recorded", () => {
    const { timerState, recorder } = loadModules();
    const now = 1_000_000;
    const { settings, state } = startedBrowserTimer(timerState, now);
    const tracker = recorder.observe(null, state, settings, timerState, now).tracker;

    const switched = timerState.manualSwitchToModeState(state, settings, "short-break", now + 20_000);
    const result = recorder.observe(tracker, switched, settings, timerState, now + 20_000);
    assert.equal(result.record, null);
    assert.equal(result.tracker.mode, "short-break");
});

test("the recorder does not change the browser timer state or its patterns", () => {
    const { timerState, recorder } = loadModules();
    const settings = timerState.normalizeSettings({ patternType: "compact", focusCycles: 2 });
    const state = timerState.startTimerState(timerState.getDefaultTimerState(settings), settings, 1_000_000);
    const before = JSON.stringify(state);

    recorder.observe(null, state, settings, timerState, 1_000_000);
    assert.equal(JSON.stringify(state), before);
    assert.deepEqual(
        Array.from(timerState.getPatternPhases("compact"), phase => phase.mode),
        ["pomodoro", "short-break", "pomodoro", "long-break"]
    );
    assert.equal(timerState.getPatternPhases("classic").length, 8);
});
