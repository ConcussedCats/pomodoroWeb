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
    const attributes = new Map();

    return {
        id,
        dataset: {},
        textContent: "",
        classList: createClassList(initialClasses),
        setAttribute(name, value) {
            attributes.set(name, String(value));
        },
        getAttribute(name) {
            return attributes.get(name) || null;
        }
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
        setTimeout(callback) {
            callback();
            return 1;
        },
        clearInterval(id) {
            intervals.delete(id);
        },
        requestAnimationFrame(callback) {
            callback();
            return 1;
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

test("mini timer hydrates from persisted running timer state and shows matching mode, time, and running status", () => {
    const runtime = withMockedNow(2_015_000, () => {
        const setupContext = bootstrapMiniTimer({ now: 2_000_000 });
        const settings = setupContext.timerState.getDefaultSettings();
        const runningState = setupContext.timerState.startTimerState(
            setupContext.timerState.getDefaultTimerState(settings),
            settings,
            2_000_000
        );

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

test("mini timer shows completed status for a finished session", () => {
    const runtime = bootstrapMiniTimer();
    const settings = runtime.timerState.normalizeSettings({
        pomodoro: 1,
        shortBreak: 1,
        longBreak: 1,
        focusCycles: 1,
        patternType: "compact"
    });
    const completed = runtime.timerState.hydrateTimerState({
        patternType: "compact",
        currentCycleIndex: 0,
        currentPhaseIndex: 3,
        currentMode: "long-break",
        isRunning: true,
        endTime: 1_000_000,
        remainingSeconds: 0,
        sessionCompleted: false
    }, settings, 1_000_000);

    runtime.document.dispatchEvent(new FakeCustomEvent("timer:state-updated", {
        detail: {
            settings,
            state: completed
        }
    }));

    assert.equal(runtime.elements.miniTimerStatus.textContent, "Completed");
    assert.equal(runtime.elements.miniTimerTime.textContent, "00:00");
    assert.equal(runtime.elements.miniTimer.classList.contains("mini-timer--long-break"), true);
});

test("mini timer updates immediately when the main timer dispatches timer state changes", () => {
    const runtime = bootstrapMiniTimer();
    const settings = runtime.timerState.normalizeSettings({ patternType: "compact" });
    const pausedState = {
        patternType: "compact",
        currentCycleIndex: 1,
        currentPhaseIndex: 2,
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 150,
        sessionCompleted: false
    };

    runtime.document.dispatchEvent(new FakeCustomEvent("timer:state-updated", {
        detail: {
            settings,
            state: pausedState
        }
    }));

    assert.equal(runtime.elements.miniTimerMode.textContent, "Pomodoro");
    assert.equal(runtime.elements.miniTimerTime.textContent, "02:30");
    assert.equal(runtime.elements.miniTimerStatus.textContent, "Paused");
    assert.equal(runtime.elements.miniTimer.dataset.running, "false");
});

test("mini timer reacts to storage-driven timer changes without manual reload", () => {
    const runtime = bootstrapMiniTimer();
    const settings = runtime.timerState.normalizeSettings({ patternType: "compact" });
    const updatedState = {
        patternType: "compact",
        currentCycleIndex: 0,
        currentPhaseIndex: 1,
        currentMode: "short-break",
        isRunning: false,
        endTime: null,
        remainingSeconds: 754,
        sessionCompleted: false
    };

    runtime.timerState.saveSettings(settings);
    runtime.timerState.saveTimerState(updatedState, settings);
    runtime.window.dispatchEvent({
        type: "storage",
        key: runtime.timerState.keys.TIMER_STATE_KEY
    });

    assert.equal(runtime.elements.miniTimerMode.textContent, "Short Break");
    assert.equal(runtime.elements.miniTimerTime.textContent, "12:34");
    assert.equal(runtime.elements.miniTimerStatus.textContent, "Paused");
});
