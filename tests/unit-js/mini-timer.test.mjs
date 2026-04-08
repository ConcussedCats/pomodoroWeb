import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import {
    createLocalStorage,
    withMockedNow
} from "./timer-state.test-utils.mjs";

function createEventTarget() {
    const listeners = new Map();

    return {
        addEventListener(type, callback) {
            if (!listeners.has(type)) {
                listeners.set(type, []);
            }

            listeners.get(type).push(callback);
        },
        dispatchEvent(event) {
            const callbacks = listeners.get(event.type) || [];

            callbacks.forEach(callback => callback(event));
            return true;
        }
    };
}

function createClassList(initialClasses = []) {
    const classes = new Set(initialClasses);

    return {
        add(...tokens) {
            tokens.forEach(token => classes.add(token));
        },
        remove(...tokens) {
            tokens.forEach(token => classes.delete(token));
        },
        contains(token) {
            return classes.has(token);
        }
    };
}

function createElement(id, initialClasses = []) {
    return {
        id,
        dataset: {},
        textContent: "",
        classList: createClassList(initialClasses)
    };
}

function createDocument(elements) {
    const documentTarget = createEventTarget();
    const elementMap = new Map(elements.map(element => [element.id, element]));

    return {
        ...documentTarget,
        getElementById(id) {
            return elementMap.get(id) || null;
        }
    };
}

class FakeCustomEvent {
    constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
    }
}

function runScriptInContext(context, relativePath) {
    const filePath = path.resolve(relativePath);
    const source = readFileSync(filePath, "utf8");

    vm.runInContext(source, context, { filename: path.basename(filePath) });
}

function bootstrapMiniTimer({ initialStorage = {}, now = 1_000_000 } = {}) {
    const localStorage = createLocalStorage(initialStorage);
    const elements = {
        miniTimer: createElement("miniTimer", ["mini-timer", "mini-timer--pomodoro"]),
        miniTimerMode: createElement("miniTimerMode"),
        miniTimerTime: createElement("miniTimerTime"),
        miniTimerStatus: createElement("miniTimerStatus")
    };
    const document = createDocument(Object.values(elements));
    const windowTarget = createEventTarget();
    const intervals = new Map();
    let intervalId = 0;

    const context = {
        console: {
            warn() {},
            log() {},
            error() {}
        },
        document,
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
        CustomEvent: FakeCustomEvent,
        setInterval(callback, delay) {
            intervalId += 1;
            intervals.set(intervalId, { callback, delay });
            return intervalId;
        },
        clearInterval(id) {
            intervals.delete(id);
        },
        addEventListener(...args) {
            return windowTarget.addEventListener(...args);
        },
        dispatchEvent(...args) {
            return windowTarget.dispatchEvent(...args);
        }
    };

    context.window = context;

    vm.createContext(context);

    return withMockedNow(now, () => {
        runScriptInContext(context, "src/main/resources/static/js/timer-state.js");
        runScriptInContext(context, "src/main/resources/static/js/mini-timer.js");
        document.dispatchEvent(new FakeCustomEvent("DOMContentLoaded"));

        return {
            document,
            window: context,
            localStorage,
            elements,
            intervals,
            timerState: context.PomodoroTimerState
        };
    });
}

function createRunningState(timerState, settings, startAt, elapsedSeconds = 0) {
    const freshState = timerState.getDefaultTimerState(settings);
    const started = timerState.startTimerState(freshState, settings, startAt);

    return {
        ...started,
        remainingSeconds: Math.max(0, started.remainingSeconds - elapsedSeconds)
    };
}

test("mini timer hydrates from persisted running timer state and shows matching mode, time, and running status", () => {
    const runtime = withMockedNow(2_015_000, () => {
        const setupContext = bootstrapMiniTimer({ now: 2_000_000 });
        const settings = setupContext.timerState.getDefaultSettings();
        const runningState = createRunningState(setupContext.timerState, settings, 2_000_000, 0);

        setupContext.timerState.saveSettings(settings);
        setupContext.timerState.saveTimerState(runningState, settings);

        return bootstrapMiniTimer({
            initialStorage: setupContext.localStorage.snapshot(),
            now: 2_015_000
        });
    });

    assert.equal(runtime.elements.miniTimerMode.textContent, "Pomodoro");
    assert.equal(runtime.elements.miniTimerTime.textContent, "24:45");
    assert.equal(runtime.elements.miniTimerStatus.textContent, "Running");
    assert.equal(runtime.elements.miniTimer.dataset.running, "true");
    assert.equal(runtime.elements.miniTimer.classList.contains("mini-timer--pomodoro"), true);
});

test("mini timer updates immediately when the main timer dispatches timer state changes", () => {
    const runtime = bootstrapMiniTimer();
    const settings = runtime.timerState.getDefaultSettings();
    const pausedState = {
        currentMode: "short-break",
        isRunning: false,
        endTime: null,
        remainingSeconds: 150,
        completedPomodorosInCycle: 1,
        completedFocusCycles: 0
    };

    runtime.document.dispatchEvent(new FakeCustomEvent("timer:state-updated", {
        detail: {
            settings,
            state: pausedState
        }
    }));

    assert.equal(runtime.elements.miniTimerMode.textContent, "Short Break");
    assert.equal(runtime.elements.miniTimerTime.textContent, "02:30");
    assert.equal(runtime.elements.miniTimerStatus.textContent, "Paused");
    assert.equal(runtime.elements.miniTimer.dataset.running, "false");
    assert.equal(runtime.elements.miniTimer.classList.contains("mini-timer--short-break"), true);
});

test("mini timer reacts to storage-driven timer changes without manual reload", () => {
    const runtime = bootstrapMiniTimer();
    const settings = runtime.timerState.getDefaultSettings();
    const updatedState = {
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 754,
        completedPomodorosInCycle: 0,
        completedFocusCycles: 0
    };

    runtime.timerState.saveSettings(settings);
    runtime.timerState.saveTimerState(updatedState, settings);
    runtime.window.dispatchEvent({
        type: "storage",
        key: runtime.timerState.keys.TIMER_STATE_KEY
    });

    assert.equal(runtime.elements.miniTimerMode.textContent, "Pomodoro");
    assert.equal(runtime.elements.miniTimerTime.textContent, "12:34");
    assert.equal(runtime.elements.miniTimerStatus.textContent, "Paused");
    assert.equal(runtime.elements.miniTimer.dataset.running, "false");
});

test("mini timer keeps the current state when a new page bootstraps from the same storage", () => {
    const initialRuntime = withMockedNow(5_000_000, () => bootstrapMiniTimer({ now: 5_000_000 }));
    const settings = initialRuntime.timerState.getDefaultSettings();
    const runningState = createRunningState(initialRuntime.timerState, settings, 5_000_000, 0);

    initialRuntime.timerState.saveSettings(settings);
    initialRuntime.timerState.saveTimerState(runningState, settings);

    const nextPageRuntime = withMockedNow(5_020_000, () => bootstrapMiniTimer({
        initialStorage: initialRuntime.localStorage.snapshot(),
        now: 5_020_000
    }));

    assert.equal(nextPageRuntime.elements.miniTimerMode.textContent, "Pomodoro");
    assert.equal(nextPageRuntime.elements.miniTimerTime.textContent, "24:40");
    assert.equal(nextPageRuntime.elements.miniTimerStatus.textContent, "Running");
    assert.equal(nextPageRuntime.elements.miniTimer.dataset.running, "true");
});
