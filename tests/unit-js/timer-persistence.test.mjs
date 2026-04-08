import assert from "node:assert/strict";
import test from "node:test";

import {
    loadTimerStateModule,
    withMockedNow
} from "./timer-state.test-utils.mjs";

test("saves and loads normalized settings through localStorage", () => {
    const { timerState, localStorage } = loadTimerStateModule();

    const saved = timerState.saveSettings({
        pomodoro: 40,
        shortBreak: 8,
        longBreak: 25,
        soundEnabled: false,
        focusCycles: 2
    });
    const stored = JSON.parse(localStorage.getItem(timerState.keys.SETTINGS_KEY));
    const loaded = timerState.loadSettings();

    assert.equal(saved.pomodoro, 40);
    assert.equal(saved.shortBreak, 8);
    assert.equal(saved.longBreak, 25);
    assert.equal(saved.soundEnabled, false);
    assert.equal(saved.focusCycles, 2);

    assert.equal(stored.pomodoro, 40);
    assert.equal(stored.shortBreak, 8);
    assert.equal(stored.longBreak, 25);
    assert.equal(stored.soundEnabled, false);
    assert.equal(stored.focusCycles, 2);

    assert.equal(loaded.pomodoro, 40);
    assert.equal(loaded.shortBreak, 8);
    assert.equal(loaded.longBreak, 25);
    assert.equal(loaded.soundEnabled, false);
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
    assert.equal(loaded.focusCycles, 1);
});

test("normalizes invalid timer state values before persisting them", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const normalized = timerState.saveTimerState({
        currentMode: "unsupported-mode",
        isRunning: false,
        endTime: null,
        remainingSeconds: -10,
        completedPomodorosInCycle: -5,
        completedFocusCycles: -1
    }, settings);

    assert.equal(normalized.currentMode, "pomodoro");
    assert.equal(normalized.remainingSeconds, 25 * 60);
    assert.equal(normalized.completedPomodorosInCycle, 0);
    assert.equal(normalized.completedFocusCycles, 0);
    assert.ok(localStorage.getItem(timerState.keys.TIMER_STATE_KEY));
});

test("falls back to the default timer state when saved timer JSON is corrupted", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();

    localStorage.setItem(timerState.keys.TIMER_STATE_KEY, "{broken-json");
    const loaded = timerState.loadTimerState(settings);

    assert.equal(loaded.currentMode, "pomodoro");
    assert.equal(loaded.isRunning, false);
    assert.equal(loaded.remainingSeconds, 25 * 60);
});

test("loads and persists timer state through localStorage without UI interaction", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const customState = {
        currentMode: "short-break",
        isRunning: false,
        endTime: null,
        remainingSeconds: 5 * 60,
        completedPomodorosInCycle: 1,
        completedFocusCycles: 0
    };

    timerState.saveTimerState(customState, settings);
    const stored = JSON.parse(localStorage.getItem(timerState.keys.TIMER_STATE_KEY));
    const loaded = timerState.loadTimerState(settings);

    assert.equal(stored.currentMode, "short-break");
    assert.equal(stored.remainingSeconds, 5 * 60);

    // Idle short-break states are intentionally normalized back to a fresh pomodoro state on load.
    assert.equal(loaded.currentMode, "pomodoro");
    assert.equal(loaded.isRunning, false);
    assert.equal(loaded.remainingSeconds, 25 * 60);
});

test("persists timer state fields needed for later recovery", () => {
    const { timerState, localStorage } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const runningState = {
        currentMode: "pomodoro",
        isRunning: true,
        endTime: 9_999_000,
        remainingSeconds: 1_111,
        completedPomodorosInCycle: 2,
        completedFocusCycles: 1
    };

    timerState.saveTimerState(runningState, settings);
    const stored = JSON.parse(localStorage.getItem(timerState.keys.TIMER_STATE_KEY));

    assert.equal(stored.currentMode, "pomodoro");
    assert.equal(stored.isRunning, true);
    assert.equal(stored.endTime, 9_999_000);
    assert.equal(stored.remainingSeconds, 1_111);
    assert.equal(stored.completedPomodorosInCycle, 2);
    assert.equal(stored.completedFocusCycles, 1);
});

test("restores a paused timer state after reload without changing its mode or remaining time", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const pausedState = {
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 321,
        completedPomodorosInCycle: 1,
        completedFocusCycles: 0
    };

    timerState.saveTimerState(pausedState, settings);
    const restored = withMockedNow(7_000_000, () => timerState.loadTimerState(settings));

    assert.equal(restored.currentMode, "pomodoro");
    assert.equal(restored.isRunning, false);
    assert.equal(restored.endTime, null);
    assert.equal(restored.remainingSeconds, 321);
    assert.equal(restored.completedPomodorosInCycle, 1);
    assert.equal(restored.completedFocusCycles, 0);
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

test("recovery keeps a running timer in the next mode if the previous session finished while user was away", () => {
    const settingsNow = 9_000_000;

    const restored = withMockedNow(settingsNow, () => {
        const { timerState, localStorage } = loadTimerStateModule();
        const settings = timerState.getDefaultSettings();
        const savedRunningPomodoro = {
            currentMode: "pomodoro",
            isRunning: true,
            endTime: settingsNow - 10_000,
            remainingSeconds: 1,
            completedPomodorosInCycle: 0,
            completedFocusCycles: 0
        };

        timerState.saveTimerState(savedRunningPomodoro, settings);
        assert.ok(localStorage.getItem(timerState.keys.TIMER_STATE_KEY));
        return timerState.loadTimerState(settings);
    });

    assert.equal(restored.currentMode, "short-break");
    assert.equal(restored.isRunning, true);
    assert.equal(restored.remainingSeconds, (5 * 60) - 10);
    assert.equal(restored.completedPomodorosInCycle, 1);
    assert.equal(restored.completedFocusCycles, 0);
});
