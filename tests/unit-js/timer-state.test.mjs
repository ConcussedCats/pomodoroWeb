import assert from "node:assert/strict";
import test from "node:test";

import {
    getStartedPomodoro,
    loadTimerStateModule
} from "./timer-state.test-utils.mjs";

test("normalizes settings with default classic pattern and clamps invalid values", () => {
    const { timerState } = loadTimerStateModule();

    const defaults = timerState.getDefaultSettings();
    const normalized = timerState.normalizeSettings({
        pomodoro: -1,
        shortBreak: 99,
        longBreak: "bad",
        focusCycles: 0,
        soundEnabled: false,
        patternType: "unknown"
    });

    assert.equal(defaults.focusCycles, 4);
    assert.equal(defaults.patternType, "classic");
    assert.equal(normalized.pomodoro, 25);
    assert.equal(normalized.shortBreak, 30);
    assert.equal(normalized.longBreak, 15);
    assert.equal(normalized.focusCycles, 4);
    assert.equal(normalized.soundEnabled, false);
    assert.equal(normalized.patternType, "classic");
});

test("starts with first work phase, first cycle, and one filled dot", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const state = timerState.getDefaultTimerState(settings);

    assert.equal(state.currentMode, "pomodoro");
    assert.equal(state.currentCycleIndex, 0);
    assert.equal(state.currentPhaseIndex, 0);
    assert.equal(state.sessionCompleted, false);
    assert.equal(state.remainingSeconds, 25 * 60);
    assert.equal(timerState.getFilledDotsCount(state, settings), 1);
    assert.equal(timerState.getCurrentCycleNumber(state, settings), 1);
});

test("autotransitions through classic cycle phases and keeps running", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const completedAt = 1_000_000;

    const firstWork = {
        patternType: "classic",
        currentCycleIndex: 0,
        currentPhaseIndex: 0,
        currentMode: "pomodoro",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        sessionCompleted: false
    };
    const secondWork = {
        patternType: "classic",
        currentCycleIndex: 0,
        currentPhaseIndex: 1,
        currentMode: "short-break",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        sessionCompleted: false
    };

    const nextAfterWork = timerState.hydrateTimerState(firstWork, settings, completedAt);
    const nextAfterShortBreak = timerState.hydrateTimerState(secondWork, settings, completedAt);

    assert.equal(nextAfterWork.currentMode, "short-break");
    assert.equal(nextAfterWork.currentPhaseIndex, 1);
    assert.equal(nextAfterWork.isRunning, true);
    assert.equal(nextAfterWork.remainingSeconds, 5 * 60);
    assert.equal(timerState.getFilledDotsCount(nextAfterWork, settings), 1);

    assert.equal(nextAfterShortBreak.currentMode, "pomodoro");
    assert.equal(nextAfterShortBreak.currentPhaseIndex, 2);
    assert.equal(nextAfterShortBreak.isRunning, true);
    assert.equal(timerState.getFilledDotsCount(nextAfterShortBreak, settings), 2);
});

test("autostarts the next cycle after the final long break when more cycles remain", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({ focusCycles: 2, patternType: "classic" });
    const completedAt = 2_000_000;
    const lastPhaseOfCycleOne = {
        patternType: "classic",
        currentCycleIndex: 0,
        currentPhaseIndex: 7,
        currentMode: "long-break",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        sessionCompleted: false
    };

    const next = timerState.hydrateTimerState(lastPhaseOfCycleOne, settings, completedAt);

    assert.equal(next.currentCycleIndex, 1);
    assert.equal(next.currentPhaseIndex, 0);
    assert.equal(next.currentMode, "pomodoro");
    assert.equal(next.isRunning, true);
    assert.equal(next.remainingSeconds, 25 * 60);
    assert.equal(timerState.getFilledDotsCount(next, settings), 1);
});

test("completes after the final cycle without autostarting a new one", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({ focusCycles: 1, patternType: "compact" });
    const completedAt = 3_000_000;
    const finalLongBreak = {
        patternType: "compact",
        currentCycleIndex: 0,
        currentPhaseIndex: 3,
        currentMode: "long-break",
        isRunning: true,
        endTime: completedAt,
        remainingSeconds: 0,
        sessionCompleted: false
    };

    const next = timerState.hydrateTimerState(finalLongBreak, settings, completedAt);

    assert.equal(next.sessionCompleted, true);
    assert.equal(next.isRunning, false);
    assert.equal(next.remainingSeconds, 0);
    assert.equal(timerState.isFocusSessionFinished(next, settings), true);
    assert.equal(timerState.getCurrentCycleNumber(next, settings), 1);
    assert.equal(timerState.getFilledDotsCount(next, settings), 2);
});

test("starting a completed session restarts from first work phase", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({ focusCycles: 1, patternType: "compact" });
    const completed = timerState.hydrateTimerState({
        patternType: "compact",
        currentCycleIndex: 0,
        currentPhaseIndex: 3,
        currentMode: "long-break",
        isRunning: true,
        endTime: 4_000_000,
        remainingSeconds: 0,
        sessionCompleted: false
    }, settings, 4_000_000);

    const restarted = timerState.startTimerState(completed, settings, 4_100_000);

    assert.equal(restarted.sessionCompleted, false);
    assert.equal(restarted.currentCycleIndex, 0);
    assert.equal(restarted.currentPhaseIndex, 0);
    assert.equal(restarted.currentMode, "pomodoro");
    assert.equal(restarted.isRunning, true);
    assert.equal(restarted.remainingSeconds, 25 * 60);
});

test("skip forward autostarts the next phase and skip backward autostarts the previous cycle phase", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({ focusCycles: 2, patternType: "compact" });

    const initial = timerState.getDefaultTimerState(settings);
    const forward = timerState.skipToNextPhaseState(initial, settings, 5_000_000);
    const backward = timerState.skipToPreviousPhaseState({
        patternType: "compact",
        currentCycleIndex: 1,
        currentPhaseIndex: 0,
        currentMode: "pomodoro",
        isRunning: false,
        endTime: null,
        remainingSeconds: 25 * 60,
        sessionCompleted: false
    }, settings, 5_010_000);

    assert.equal(forward.currentPhaseIndex, 1);
    assert.equal(forward.currentMode, "short-break");
    assert.equal(forward.isRunning, true);
    assert.equal(forward.remainingSeconds, 5 * 60);

    assert.equal(backward.currentCycleIndex, 0);
    assert.equal(backward.currentPhaseIndex, 3);
    assert.equal(backward.currentMode, "long-break");
    assert.equal(backward.isRunning, true);
    assert.equal(backward.remainingSeconds, 15 * 60);
});

test("manual mode switching restores remembered time for each mode", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const now = 6_000_000;
    const runningPomodoro = timerState.startTimerState(
        timerState.getDefaultTimerState(settings),
        settings,
        now
    );
    const elapsedPomodoro = timerState.hydrateTimerState(runningPomodoro, settings, now + 2 * 60 * 1000);

    const shortBreak = timerState.manualSwitchToModeState(
        elapsedPomodoro,
        settings,
        "short-break",
        now + 2 * 60 * 1000
    );
    const elapsedShortBreak = timerState.hydrateTimerState(shortBreak, settings, now + 3 * 60 * 1000);
    const restoredPomodoro = timerState.manualSwitchToModeState(
        elapsedShortBreak,
        settings,
        "pomodoro",
        now + 3 * 60 * 1000
    );
    const restoredShortBreak = timerState.manualSwitchToModeState(
        restoredPomodoro,
        settings,
        "short-break",
        now + 3 * 60 * 1000
    );

    assert.equal(shortBreak.currentMode, "short-break");
    assert.equal(shortBreak.remainingSeconds, 5 * 60);
    assert.equal(restoredPomodoro.currentMode, "pomodoro");
    assert.equal(restoredPomodoro.remainingSeconds, 23 * 60);
    assert.equal(restoredShortBreak.currentMode, "short-break");
    assert.equal(restoredShortBreak.remainingSeconds, 4 * 60);
});

test("skip and automatic transitions use fresh phase durations instead of remembered manual mode time", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        focusCycles: 1,
        patternType: "compact"
    });
    const now = 7_000_000;
    const runningPomodoro = timerState.startTimerState(
        timerState.getDefaultTimerState(settings),
        settings,
        now
    );
    const elapsedPomodoro = timerState.hydrateTimerState(runningPomodoro, settings, now + 2 * 60 * 1000);
    const manualShortBreak = timerState.manualSwitchToModeState(
        elapsedPomodoro,
        settings,
        "short-break",
        now + 2 * 60 * 1000
    );
    const elapsedShortBreak = timerState.hydrateTimerState(manualShortBreak, settings, now + 3 * 60 * 1000);
    const skippedToPomodoro = timerState.skipToNextPhaseState(elapsedShortBreak, settings, now + 3 * 60 * 1000);

    const automaticShortBreak = timerState.hydrateTimerState(runningPomodoro, settings, now + 25 * 60 * 1000);

    assert.equal(elapsedShortBreak.remainingSeconds, 4 * 60);
    assert.equal(skippedToPomodoro.currentMode, "pomodoro");
    assert.equal(skippedToPomodoro.remainingSeconds, 25 * 60);
    assert.equal(automaticShortBreak.currentMode, "short-break");
    assert.equal(automaticShortBreak.remainingSeconds, 5 * 60);
});

test("starting flow clears stale manual mode memory after ten running seconds", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.getDefaultSettings();
    const now = 8_000_000;
    const defaultState = timerState.getDefaultTimerState(settings);

    const manualShortBreak = timerState.manualSwitchToModeState(defaultState, settings, "short-break", now);
    const shortBreakStarted = timerState.startTimerState(manualShortBreak, settings, now);
    const shortBreakAfterMinute = timerState.pauseTimerState(shortBreakStarted, settings, now + 60 * 1000);
    const restoredPomodoro = timerState.manualSwitchToModeState(
        shortBreakAfterMinute,
        settings,
        "pomodoro",
        now + 60 * 1000
    );
    const pomodoroStarted = timerState.startTimerState(restoredPomodoro, settings, now + 60 * 1000);
    const pomodoroAfterMemoryClear = timerState.hydrateTimerState(
        pomodoroStarted,
        settings,
        now + 71 * 1000
    );
    const shortBreakAfterClear = timerState.manualSwitchToModeState(
        pomodoroAfterMemoryClear,
        settings,
        "short-break",
        now + 71 * 1000
    );

    assert.equal(shortBreakAfterMinute.remainingSeconds, 4 * 60);
    assert.equal(restoredPomodoro.remainingSeconds, 25 * 60);
    assert.equal(pomodoroAfterMemoryClear.currentMode, "pomodoro");
    assert.equal(pomodoroAfterMemoryClear.remainingSeconds, (25 * 60) - 11);
    assert.equal(shortBreakAfterClear.currentMode, "short-break");
    assert.equal(shortBreakAfterClear.remainingSeconds, 5 * 60);
});

test("restarts paused state from a clean session when settings change", () => {
    const { timerState } = loadTimerStateModule();
    const originalSettings = timerState.getDefaultSettings();
    const newSettings = timerState.normalizeSettings({
        pomodoro: 40,
        shortBreak: 10,
        longBreak: 30,
        focusCycles: 2,
        patternType: "compact"
    });
    const pausedLaterPhase = {
        patternType: "classic",
        currentCycleIndex: 0,
        currentPhaseIndex: 5,
        currentMode: "short-break",
        isRunning: false,
        endTime: null,
        remainingSeconds: 120,
        sessionCompleted: false
    };

    const applied = timerState.applySettingsToTimerState(pausedLaterPhase, newSettings);
    const running = timerState.startTimerState(
        timerState.getDefaultTimerState(originalSettings),
        originalSettings,
        Date.now()
    );
    const appliedRunning = timerState.applySettingsToTimerState(running, newSettings);

    assert.equal(applied.currentCycleIndex, 0);
    assert.equal(applied.currentPhaseIndex, 0);
    assert.equal(applied.currentMode, "pomodoro");
    assert.equal(applied.remainingSeconds, 40 * 60);
    assert.equal(applied.patternType, "compact");
    assert.equal(appliedRunning.isRunning, true);
    assert.equal(appliedRunning.endTime, running.endTime);
});

test("projects the end of a compact single-cycle session from a paused state", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 10,
        shortBreak: 2,
        longBreak: 5,
        focusCycles: 1,
        patternType: "compact"
    });

    const projected = timerState.getProjectedSessionEndTime(
        timerState.getDefaultTimerState(settings),
        settings,
        100_000
    );

    assert.equal(projected, 100_000 + ((10 + 2 + 10 + 5) * 60 * 1000));
});

test("recovers across elapsed phases using phase-aware logic", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 1,
        shortBreak: 1,
        longBreak: 1,
        focusCycles: 1,
        patternType: "compact"
    });
    const running = timerState.startTimerState(timerState.getDefaultTimerState(settings), settings, 0);

    const restored = timerState.hydrateTimerState(running, settings, 70_000);

    assert.equal(restored.currentMode, "short-break");
    assert.equal(restored.currentPhaseIndex, 1);
    assert.equal(restored.isRunning, true);
    assert.equal(restored.remainingSeconds, 50);
});

test("keeps pathological elapsed state bounded and valid", () => {
    const { timerState } = loadTimerStateModule();
    const settings = timerState.normalizeSettings({
        pomodoro: 1,
        shortBreak: 1,
        longBreak: 1,
        focusCycles: 2,
        patternType: "classic"
    });
    const { started } = getStartedPomodoro(timerState, 1_000);
    const hydrated = timerState.hydrateTimerState(started, settings, 10_000_000);

    assert.equal(typeof hydrated.remainingSeconds, "number");
    assert.ok(hydrated.remainingSeconds >= 0);
    assert.ok(hydrated.currentCycleIndex >= 0);
    assert.ok(hydrated.currentPhaseIndex >= 0);
});
