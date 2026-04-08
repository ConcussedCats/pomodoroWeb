import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

function createLocalStorage() {
    const store = new Map();

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        }
    };
}

export function loadTimerStateModule() {
    const filePath = path.resolve("src/main/resources/static/js/timer-state.js");
    const source = readFileSync(filePath, "utf8");
    const localStorage = createLocalStorage();
    const context = {
        console: {
            warn() {},
            log() {},
            error() {}
        },
        localStorage,
        Date,
        Math,
        JSON,
        Number,
        String,
        Boolean,
        Object,
        Array,
        Intl
    };

    context.window = context;

    vm.createContext(context);
    vm.runInContext(source, context, { filename: "timer-state.js" });

    return {
        timerState: context.PomodoroTimerState,
        localStorage
    };
}

export function getStartedPomodoro(timerState, now = 1_000_000) {
    const settings = timerState.getDefaultSettings();
    const state = timerState.getDefaultTimerState(settings);

    return {
        now,
        settings,
        state,
        started: timerState.startTimerState(state, settings, now)
    };
}

export function withMockedNow(now, callback) {
    const originalNow = Date.now;
    Date.now = () => now;

    try {
        return callback();
    } finally {
        Date.now = originalNow;
    }
}
