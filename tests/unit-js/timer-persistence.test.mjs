import assert from "node:assert/strict";
import test from "node:test";

import {
    loadTimerStateModule,
    withMockedNow
} from "./timer-state.test-utils.mjs";

test("saves and loads normalized settings including pattern type", () => {
    const { timerState, localStorage } = loadTimerStateModule();

    const saved = timerState.saveSettings({
        pomodoro: 40,
        shortBreak: 8,
        longBreak: 25,
        soundEnabled: false,
        focusCycles: 2,
        patternType: "compact"
    });
    const stored = JSON.parse(localStorage.getItem(timerState.keys.SETTINGS_KEY));
    const loaded = timerState.loadSettings();

    assert.equal(saved.patternType, "compact");
    assert.equal(stored.patternType, "compact");
    assert.equal(loaded.patternType, "compact");
    assert.equal(loaded.focusCycles, 2);
});

test("falls back safely when saved settings JSON is corrupted", () => {
    const { timerState, localStorage } = loadTimerStateModule();

    localStorage.setItem(timerState.keys.SETTINGS_KEY, "{invalid-json");
    const loaded = timerState.loadSettings();

    assert.equal(loaded.pomodoro, 25);
    assert.equal(loaded.shortBreak, 5);
    assert.equal(loaded.longBreak, 15);
    assert.equal(loaded.soundEnabled, true);
    assert.equal(loaded.focusCycles, 4);
    assert.equal(loaded.patternType, "classic");
});

test("normalizes invalid timer state values before persisting them", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const normalized = timerState.saveTimerState({
        patternType: "broken",
        currentCycleIndex: -2,
        currentPhaseIndex: 99,
        currentMode: "unsupported-mode",
        isRunning: false,
        endTime: null,
        remainingSeconds: -10,
        sessionCompleted: false
    }, settings);

    assert.equal(normalized.patternType, "classic");
    assert.equal(normalized.currentCycleIndex, 0);
    assert.equal(normalized.currentPhaseIndex, 7);
    assert.equal(normalized.currentMode, "long-break");
    assert.equal(normalized.remainingSeconds, 15 * 60);
    assert.ok(localStorage.getItem(timerState.keys.TIMER_STATE_KEY));
});

test("falls back to the default timer state when saved timer JSON is corrupted", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();

    localStorage.setItem(timerState.keys.TIMER_STATE_KEY, "{broken-json");
    const loaded = timerState.loadTimerState(settings);

    assert.equal(loaded.currentMode, "pomodoro");
    assert.equal(loaded.currentCycleIndex, 0);
    assert.equal(loaded.currentPhaseIndex, 0);
    assert.equal(loaded.remainingSeconds, 25 * 60);
});

test("loads and persists paused timer state through localStorage", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({ patternType: "compact", focusCycles: 3 });
    const customState = {
        patternType: "compact",
        currentCycleIndex: 1,
        currentPhaseIndex: 2,
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 123,
        sessionCompleted: false
    };

    timerState.saveTimerState(customState, settings);
    const stored = JSON.parse(localStorage.getItem(timerState.keys.TIMER_STATE_KEY));
    const loaded = timerState.loadTimerState(settings);

    assert.equal(stored.currentCycleIndex, 1);
    assert.equal(stored.currentPhaseIndex, 2);
    assert.equal(stored.patternType, "compact");
    assert.equal(loaded.currentCycleIndex, 1);
    assert.equal(loaded.currentPhaseIndex, 2);
    assert.equal(loaded.remainingSeconds, 123);
});

test("persists timer state fields needed for later recovery", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const runningState = {
        patternType: "classic",
        currentCycleIndex: 1,
        currentPhaseIndex: 4,
        currentMode: "pomodoro",
        isRunning: true,
        endTime: 9_999_000,
        remainingSeconds: 1_111,
        sessionCompleted: false
    };

    timerState.saveTimerState(runningState, settings);
    const stored = JSON.parse(localStorage.getItem(timerState.keys.TIMER_STATE_KEY));

    assert.equal(stored.currentCycleIndex, 1);
    assert.equal(stored.currentPhaseIndex, 4);
    assert.equal(stored.isRunning, true);
    assert.equal(stored.endTime, 9_999_000);
    assert.equal(stored.remainingSeconds, 1_111);
});

test("restores a running timer state after reload and recalculates remaining time from timestamp", () => {
    const startAt = 8_000_000;

    const restored = withMockedNow(startAt + 15_000, () => {
        const { timerState } = loadTimerStateModule();
        const settings = timerState.getDefaultSettings();
        const running = timerState.startTimerState(
            timerState.getDefaultTimerState(settings),
            settings,
            startAt
        );

        timerState.saveTimerState(running, settings);
        return timerState.loadTimerState(settings);
    });

    assert.equal(restored.currentMode, "pomodoro");
    assert.equal(restored.isRunning, true);
    assert.equal(restored.remainingSeconds, (25 * 60) - 15);
});

test("migrates legacy saved state into the new phase-based model", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();

    localStorage.setItem(timerState.keys.TIMER_STATE_KEY, JSON.stringify({
        currentMode: "short-break",
        isRunning: false,
        endTime: null,
        remainingSeconds: 240,
        completedPomodorosInCycle: 2,
        completedFocusCycles: 1
    }));

    const loaded = timerState.loadTimerState(settings);

    assert.equal(loaded.currentCycleIndex, 1);
    assert.equal(loaded.currentPhaseIndex, 3);
    assert.equal(loaded.currentMode, "short-break");
    assert.equal(loaded.remainingSeconds, 240);
});
