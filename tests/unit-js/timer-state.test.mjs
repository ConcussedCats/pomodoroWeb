import assert from "node:assert/strict";
import test from "node:test";

import {
    getStartedPomodoro,
    loadTimerStateModule
} from "./timer-state.test-utils.mjs";

test("normalizes default and valid settings correctly", () => {
    const { timerState } = loadTimerStateModule();

    const defaults = timerState.getDefaultSettings();
    const valid = timerState.normalizeSettings({
        pomodoro: 50,
        shortBreak: 10,
        longBreak: 20,
        soundEnabled: false,
        focusCycles: 3
    });

    assert.equal(defaults.pomodoro, 25);
    assert.equal(defaults.shortBreak, 5);
    assert.equal(defaults.longBreak, 15);
    assert.equal(defaults.soundEnabled, true);
    assert.equal(defaults.focusCycles, 1);

    assert.equal(valid.pomodoro, 50);
    assert.equal(valid.shortBreak, 10);
    assert.equal(valid.longBreak, 20);
    assert.equal(valid.soundEnabled, false);
    assert.equal(valid.focusCycles, 3);
});

test("clamps invalid settings and defaults soundEnabled to true unless explicitly false", () => {
    const { timerState } = loadTimerStateModule();

    const normalized = timerState.normalizeSettings({
        pomodoro: -10,
        shortBreak: 999,
        longBreak: "not-a-number",
        focusCycles: 0,
        soundEnabled: undefined
    });

    assert.equal(normalized.pomodoro, 25);
    assert.equal(normalized.shortBreak, 30);
    assert.equal(normalized.longBreak, 15);
    assert.equal(normalized.focusCycles, 1);
    assert.equal(normalized.soundEnabled, true);
});

test("maps settings keys for each supported mode", () => {
    const { timerState } = loadTimerStateModule();

    assert.equal(timerState.getSettingsKey("pomodoro"), "pomodoro");
    assert.equal(timerState.getSettingsKey("short-break"), "shortBreak");
    assert.equal(timerState.getSettingsKey("long-break"), "longBreak");
    assert.equal(timerState.getSettingsKey("unsupported-mode"), "pomodoro");
});

test("returns the default timer state for a fresh pomodoro session", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const state = timerState.getDefaultTimerState(settings);

    assert.equal(state.currentMode, "pomodoro");
    assert.equal(state.isRunning, false);
    assert.equal(state.endTime, null);
    assert.equal(state.remainingSeconds, 25 * 60);
    assert.equal(state.completedPomodorosInCycle, 0);
    assert.equal(state.completedFocusCycles, 0);
});

test("starts a fresh pomodoro timer with the correct running state", () => {
    const { timerState } = loadTimerStateModule();
    const { now, started } = getStartedPomodoro(timerState);

    assert.equal(started.currentMode, "pomodoro");
    assert.equal(started.isRunning, true);
    assert.equal(started.remainingSeconds, 25 * 60);
    assert.equal(started.endTime, now + (25 * 60 * 1000));
});

test("starting an already running timer keeps it in a consistent running state", () => {
    const { timerState } = loadTimerStateModule();
    const { now, settings, started } = getStartedPomodoro(timerState);

    const restarted = timerState.startTimerState(started, settings, now + 5_000);

    assert.equal(restarted.isRunning, true);
    assert.equal(restarted.currentMode, "pomodoro");
    assert.equal(restarted.endTime, started.endTime);
});

test("pauses a running timer and keeps the remaining seconds", () => {
    const { timerState } = loadTimerStateModule();
    const { now, settings, started } = getStartedPomodoro(timerState);

    const paused = timerState.pauseTimerState(started, settings, now + 10_000);

    assert.equal(paused.currentMode, "pomodoro");
    assert.equal(paused.isRunning, false);
    assert.equal(paused.endTime, null);
    assert.equal(paused.remainingSeconds, (25 * 60) - 10);
});

test("resets timer state back to a fresh pomodoro session", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();

    const longBreakState = {
        currentMode: "long-break",
        isRunning: false,
        endTime: null,
        remainingSeconds: 60,
        completedPomodorosInCycle: 4,
        completedFocusCycles: 1
    };

    const reset = timerState.resetTimerState(longBreakState, settings);

    assert.equal(reset.currentMode, "pomodoro");
    assert.equal(reset.isRunning, false);
    assert.equal(reset.endTime, null);
    assert.equal(reset.remainingSeconds, 25 * 60);
    assert.equal(reset.completedPomodorosInCycle, 0);
    assert.equal(reset.completedFocusCycles, 0);
});

test("recomputes paused remaining time when applying new settings and leaves running state untouched", () => {
    const { timerState } = loadTimerStateModule();
    const originalSettings = timerState.getDefaultSettings();
    const newSettings = timerState.normalizeSettings({
        pomodoro: 40,
        shortBreak: 10,
        longBreak: 30,
        soundEnabled: true,
        focusCycles: 2
    });

    const pausedState = {
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 100,
        completedPomodorosInCycle: 0,
        completedFocusCycles: 0
    };
    const now = Date.now();
    const runningState = timerState.startTimerState(
        timerState.getDefaultTimerState(originalSettings),
        originalSettings,
        now
    );

    const appliedPaused = timerState.applySettingsToTimerState(pausedState, newSettings);
    const appliedRunning = timerState.applySettingsToTimerState(runningState, newSettings);

    assert.equal(appliedPaused.remainingSeconds, 40 * 60);
    assert.equal(appliedPaused.currentMode, "pomodoro");
    assert.equal(appliedRunning.isRunning, true);
    assert.equal(appliedRunning.endTime, runningState.endTime);
});

test("sets the requested current mode and falls back safely for an invalid mode", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const baseState = timerState.getDefaultTimerState(settings);

    const shortBreak = timerState.setModeState(baseState, settings, "short-break");
    const invalid = timerState.setModeState(baseState, settings, "unsupported-mode");

    assert.equal(shortBreak.currentMode, "short-break");
    assert.equal(shortBreak.remainingSeconds, 5 * 60);
    assert.equal(shortBreak.isRunning, false);

    assert.equal(invalid.currentMode, "pomodoro");
    assert.equal(invalid.remainingSeconds, 25 * 60);
});

test("transitions from pomodoro to short break when a work session completes", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const completedAt = 2_000_000;

    const runningPomodoro = {
        currentMode: "pomodoro",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        completedPomodorosInCycle: 0,
        completedFocusCycles: 0
    };

    const next = timerState.hydrateTimerState(runningPomodoro, settings, completedAt);

    assert.equal(next.currentMode, "short-break");
    assert.equal(next.isRunning, true);
    assert.equal(next.completedPomodorosInCycle, 1);
    assert.equal(next.completedFocusCycles, 0);
    assert.equal(next.remainingSeconds, 5 * 60);
});

test("transitions from the fourth pomodoro to a long break", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const completedAt = 3_000_000;

    const fourthPomodoro = {
        currentMode: "pomodoro",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        completedPomodorosInCycle: 3,
        completedFocusCycles: 0
    };

    const next = timerState.hydrateTimerState(fourthPomodoro, settings, completedAt);

    assert.equal(next.currentMode, "long-break");
    assert.equal(next.isRunning, true);
    assert.equal(next.completedPomodorosInCycle, 4);
    assert.equal(next.completedFocusCycles, 0);
    assert.equal(next.remainingSeconds, 15 * 60);
});

test("transitions from short break back to pomodoro when the break completes", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const completedAt = 3_500_000;

    const shortBreak = {
        currentMode: "short-break",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        completedPomodorosInCycle: 2,
        completedFocusCycles: 0
    };

    const next = timerState.hydrateTimerState(shortBreak, settings, completedAt);

    assert.equal(next.currentMode, "pomodoro");
    assert.equal(next.isRunning, true);
    assert.equal(next.remainingSeconds, 25 * 60);
    assert.equal(next.completedPomodorosInCycle, 2);
});

test("transitions from long break into the next focus cycle when more cycles remain", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        focusCycles: 2,
        soundEnabled: true
    });
    const completedAt = 3_750_000;

    const longBreak = {
        currentMode: "long-break",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        completedPomodorosInCycle: 4,
        completedFocusCycles: 0
    };

    const next = timerState.hydrateTimerState(longBreak, settings, completedAt);

    assert.equal(next.currentMode, "pomodoro");
    assert.equal(next.isRunning, true);
    assert.equal(next.remainingSeconds, 25 * 60);
    assert.equal(next.completedPomodorosInCycle, 0);
    assert.equal(next.completedFocusCycles, 1);
});

test("completes the final long break and marks the focus session as finished", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        focusCycles: 1,
        soundEnabled: true
    });
    const completedAt = 4_000_000;

    const finalLongBreak = {
        currentMode: "long-break",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        completedPomodorosInCycle: 4,
        completedFocusCycles: 0
    };

    const next = timerState.hydrateTimerState(finalLongBreak, settings, completedAt);

    assert.equal(next.currentMode, "pomodoro");
    assert.equal(next.isRunning, false);
    assert.equal(next.endTime, null);
    assert.equal(next.remainingSeconds, 25 * 60);
    assert.equal(next.completedPomodorosInCycle, 0);
    assert.equal(next.completedFocusCycles, 1);
    assert.equal(timerState.isFocusSessionFinished(next, settings), true);
});

test("returns current pomodoro and focus cycle numbers across states", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        focusCycles: 3,
        soundEnabled: true
    });
    const fresh = timerState.getDefaultTimerState(settings);
    const secondBreak = {
        currentMode: "short-break",
        isRunning: false,
        endTime: null,
        remainingSeconds: 5 * 60,
        completedPomodorosInCycle: 2,
        completedFocusCycles: 0
    };
    const finished = {
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 25 * 60,
        completedPomodorosInCycle: 0,
        completedFocusCycles: 3
    };

    assert.equal(timerState.getCurrentPomodoroNumber(fresh), 1);
    assert.equal(timerState.getCurrentPomodoroNumber(secondBreak), 2);
    assert.equal(timerState.getCurrentFocusCycleNumber(fresh, settings), 1);
    assert.equal(timerState.getCurrentFocusCycleNumber(finished, settings), 3);
});

test("computes projected session end time and returns null once the session is finished", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 1,
        shortBreak: 1,
        longBreak: 1,
        focusCycles: 1,
        soundEnabled: true
    });
    const fresh = timerState.getDefaultTimerState(settings);
    const finished = {
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 60,
        completedPomodorosInCycle: 0,
        completedFocusCycles: 1
    };

    const projection = timerState.getProjectedSessionEndTime(fresh, settings, 10_000);

    assert.equal(typeof projection, "number");
    assert.ok(projection > 10_000);
    assert.equal(timerState.getProjectedSessionEndTime(finished, settings, 10_000), null);
});

test("compares timer states by all persisted fields", () => {
    const { timerState } = loadTimerStateModule();
    const stateA = {
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 100,
        completedPomodorosInCycle: 0,
        completedFocusCycles: 0
    };
    const stateB = { ...stateA };
    const stateC = { ...stateA, remainingSeconds: 99 };

    assert.equal(timerState.areStatesEqual(stateA, stateB), true);
    assert.equal(timerState.areStatesEqual(stateA, stateC), false);
});

test("handles a pathological elapsed running state without producing invalid output", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 1,
        shortBreak: 1,
        longBreak: 1,
        focusCycles: 50,
        soundEnabled: true
    });
    const pathological = {
        currentMode: "pomodoro",
        isRunning: true,
        endTime: 1_000,
        remainingSeconds: 60,
        completedPomodorosInCycle: 0,
        completedFocusCycles: 0
    };

    const hydrated = timerState.hydrateTimerState(pathological, settings, 1_000 + (10_000 * 60 * 1000));

    assert.ok(["pomodoro", "short-break", "long-break"].includes(hydrated.currentMode));
    assert.equal(hydrated.remainingSeconds >= 0, true);
    assert.equal(typeof hydrated.completedPomodorosInCycle, "number");
    assert.equal(typeof hydrated.completedFocusCycles, "number");
});
