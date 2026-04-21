(function () {
    const SETTINGS_KEY = "pomodoroSettings";
    const TIMER_STATE_KEY = "pomodoroTimerState";
    const POMODOROS_PER_CYCLE = 1;

    const DEFAULT_SETTINGS = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        soundEnabled: true,
        focusCycles: 4
    };

    const VALID_MODES = ["pomodoro", "short-break", "long-break"];

    function toPositiveInteger(value, fallback, min = 1, max = Number.POSITIVE_INFINITY) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < min) {
            return fallback;
        }
        return Math.min(parsed, max);
    }

    function normalizeSettings(settings = {}) {
        return {
            pomodoro: toPositiveInteger(settings.pomodoro, DEFAULT_SETTINGS.pomodoro, 1, 120),
            shortBreak: toPositiveInteger(settings.shortBreak, DEFAULT_SETTINGS.shortBreak, 1, 30),
            longBreak: toPositiveInteger(settings.longBreak, DEFAULT_SETTINGS.longBreak, 1, 80),
            soundEnabled: settings.soundEnabled !== false,
            focusCycles: toPositiveInteger(settings.focusCycles, DEFAULT_SETTINGS.focusCycles, 1, 12)
        };
    }

    function getSettingsKey(mode) {
        if (mode === "pomodoro") return "pomodoro";
        if (mode === "short-break") return "shortBreak";
        if (mode === "long-break") return "longBreak";
        return "pomodoro";
    }

    function getModeDurationSeconds(settings, mode) {
        const safeSettings = normalizeSettings(settings);
        return safeSettings[getSettingsKey(mode)] * 60;
    }

    function isFocusSessionFinished(state, settings) {
        const safeSettings = normalizeSettings(settings);
        const safeState = normalizeTimerState(state, safeSettings);
        return !safeState.isRunning
            && safeState.currentMode === "pomodoro"
            && safeState.completedPomodorosInCycle === 0
            && safeState.completedFocusCycles >= safeSettings.focusCycles
            && safeState.remainingSeconds === getModeDurationSeconds(safeSettings, "pomodoro");
    }

    function getDefaultTimerState(settings) {
        return {
            currentMode: "pomodoro",
            isRunning: false,
            endTime: null,
            remainingSeconds: getModeDurationSeconds(settings, "pomodoro"),
            completedPomodorosInCycle: 0,
            completedFocusCycles: 0
        };
    }

    function normalizeTimerState(state = {}, settings) {
        const safeSettings = normalizeSettings(settings);
        const fallback = getDefaultTimerState(safeSettings);
        const currentMode = VALID_MODES.includes(state.currentMode) ? state.currentMode : fallback.currentMode;
        const remainingFallback = getModeDurationSeconds(safeSettings, currentMode);
        const rawRemainingSeconds = Number.parseInt(state.remainingSeconds, 10);
        const remainingSeconds = Number.isFinite(rawRemainingSeconds) && rawRemainingSeconds >= 0
            ? rawRemainingSeconds
            : remainingFallback;
        const completedPomodorosInCycle = Math.min(
            toPositiveInteger(state.completedPomodorosInCycle, 0, 0, POMODOROS_PER_CYCLE),
            POMODOROS_PER_CYCLE
        );
        const completedFocusCycles = toPositiveInteger(state.completedFocusCycles, 0, 0);
        const isRunning = Boolean(state.isRunning);
        const rawEndTime = Number(state.endTime);
        const endTime = isRunning && Number.isFinite(rawEndTime) ? rawEndTime : null;

        return {
            currentMode,
            isRunning,
            endTime,
            remainingSeconds,
            completedPomodorosInCycle,
            completedFocusCycles
        };
    }

    function cloneState(state) {
        return {
            currentMode: state.currentMode,
            isRunning: state.isRunning,
            endTime: state.endTime,
            remainingSeconds: state.remainingSeconds,
            completedPomodorosInCycle: state.completedPomodorosInCycle,
            completedFocusCycles: state.completedFocusCycles
        };
    }

    function loadSettings() {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (!saved) {
            return normalizeSettings();
        }

        try {
            return normalizeSettings(JSON.parse(saved));
        } catch (error) {
            console.warn("Failed to parse saved settings.", error);
            return normalizeSettings();
        }
    }

    function saveSettings(settings) {
        const normalized = normalizeSettings(settings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function saveTimerState(state, settings) {
        const normalized = normalizeTimerState(state, settings || loadSettings());
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function loadTimerState(settings) {
        const safeSettings = normalizeSettings(settings);
        const saved = localStorage.getItem(TIMER_STATE_KEY);
        if (!saved) {
            return getDefaultTimerState(safeSettings);
        }

        try {
            const hydratedState = hydrateTimerState(JSON.parse(saved), safeSettings, Date.now());
            return hydratedState;
        } catch (error) {
            console.warn("Failed to parse saved timer state.", error);
            return getDefaultTimerState(safeSettings);
        }
    }

    function getRemainingSeconds(state, now = Date.now()) {
        if (!state.isRunning || !state.endTime) {
            return Math.max(0, state.remainingSeconds);
        }

        return Math.max(0, Math.ceil((state.endTime - now) / 1000));
    }

    function transitionAfterCompletion(state, settings, completedAt) {
        if (state.currentMode === "pomodoro") {
            const currentFocusCycle = getCurrentFocusCycleNumber(state, settings);
            const nextMode = currentFocusCycle >= settings.focusCycles
                ? "long-break"
                : "short-break";
            const remainingSeconds = getModeDurationSeconds(settings, nextMode);

            return {
                currentMode: nextMode,
                isRunning: true,
                endTime: completedAt + (remainingSeconds * 1000),
                remainingSeconds,
                completedPomodorosInCycle: 1,
                completedFocusCycles: state.completedFocusCycles
            };
        }

        if (state.currentMode === "short-break") {
            const completedFocusCycles = state.completedFocusCycles + 1;
            if (completedFocusCycles >= settings.focusCycles) {
                return {
                    currentMode: "pomodoro",
                    isRunning: false,
                    endTime: null,
                    remainingSeconds: getModeDurationSeconds(settings, "pomodoro"),
                    completedPomodorosInCycle: 0,
                    completedFocusCycles
                };
            }

            const remainingSeconds = getModeDurationSeconds(settings, "pomodoro");
            return {
                currentMode: "pomodoro",
                isRunning: true,
                endTime: completedAt + (remainingSeconds * 1000),
                remainingSeconds,
                completedPomodorosInCycle: 0,
                completedFocusCycles
            };
        }

        if (state.currentMode === "long-break") {
            return {
                currentMode: "pomodoro",
                isRunning: false,
                endTime: null,
                remainingSeconds: getModeDurationSeconds(settings, "pomodoro"),
                completedPomodorosInCycle: 0,
                completedFocusCycles: settings.focusCycles
            };
        }

        return getDefaultTimerState(settings);
    }

    function hydrateTimerState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        let nextState = normalizeTimerState(state, safeSettings);

        if (!nextState.isRunning) {
            nextState.remainingSeconds = Math.max(0, nextState.remainingSeconds);
            return nextState;
        }

        let guard = 0;
        while (nextState.isRunning && nextState.endTime && nextState.endTime <= now && guard < 100) {
            nextState = transitionAfterCompletion(nextState, safeSettings, nextState.endTime);
            guard += 1;
        }

        nextState.remainingSeconds = getRemainingSeconds(nextState, now);
        return nextState;
    }

    function startTimerState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        let syncedState = hydrateTimerState(state, safeSettings, now);

        if (isFocusSessionFinished(syncedState, safeSettings)) {
            syncedState = getDefaultTimerState(safeSettings);
        }

        if (syncedState.isRunning) {
            return syncedState;
        }

        const remainingSeconds = syncedState.remainingSeconds > 0
            ? syncedState.remainingSeconds
            : getModeDurationSeconds(safeSettings, syncedState.currentMode);

        return {
            ...cloneState(syncedState),
            isRunning: true,
            endTime: now + (remainingSeconds * 1000),
            remainingSeconds
        };
    }

    function pauseTimerState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, now);

        if (!syncedState.isRunning) {
            return {
                ...cloneState(syncedState),
                endTime: null
            };
        }

        return {
            ...cloneState(syncedState),
            isRunning: false,
            endTime: null,
            remainingSeconds: getRemainingSeconds(syncedState, now)
        };
    }

    function resetTimerState(state, settings) {
        const safeSettings = normalizeSettings(settings);
        return getDefaultTimerState(safeSettings);
    }

    function setModeState(state, settings, mode) {
        if (!VALID_MODES.includes(mode)) {
            return normalizeTimerState(state, settings);
        }

        const safeSettings = normalizeSettings(settings);
        const syncedState = normalizeTimerState(state, safeSettings);

        return {
            currentMode: mode,
            isRunning: false,
            endTime: null,
            remainingSeconds: getModeDurationSeconds(safeSettings, mode),
            completedPomodorosInCycle: mode === "pomodoro"
                ? 0
                : syncedState.completedPomodorosInCycle,
            completedFocusCycles: syncedState.completedFocusCycles
        };
    }

    function getPhaseStartState(settings, mode, completedFocusCycles, completedPomodorosInCycle = 0) {
        const safeSettings = normalizeSettings(settings);
        const safeMode = VALID_MODES.includes(mode) ? mode : "pomodoro";
        return {
            currentMode: safeMode,
            isRunning: false,
            endTime: null,
            remainingSeconds: getModeDurationSeconds(safeSettings, safeMode),
            completedPomodorosInCycle,
            completedFocusCycles: Math.min(
                Math.max(0, completedFocusCycles),
                safeSettings.focusCycles
            )
        };
    }

    function skipToNextPhaseState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, now);

        if (syncedState.currentMode === "pomodoro") {
            const isLastCycle = getCurrentFocusCycleNumber(syncedState, safeSettings) >= safeSettings.focusCycles;
            return getPhaseStartState(
                safeSettings,
                isLastCycle ? "long-break" : "short-break",
                syncedState.completedFocusCycles,
                1
            );
        }

        if (syncedState.currentMode === "short-break") {
            const completedFocusCycles = syncedState.completedFocusCycles + 1;
            return completedFocusCycles >= safeSettings.focusCycles
                ? getDefaultTimerState(safeSettings)
                : getPhaseStartState(safeSettings, "pomodoro", completedFocusCycles, 0);
        }

        return getDefaultTimerState(safeSettings);
    }

    function skipToPreviousPhaseState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, now);

        if (syncedState.currentMode === "pomodoro") {
            if (syncedState.completedFocusCycles <= 0) {
                return syncedState;
            }

            return getPhaseStartState(
                safeSettings,
                "short-break",
                syncedState.completedFocusCycles - 1,
                1
            );
        }

        if (syncedState.currentMode === "short-break") {
            return getPhaseStartState(safeSettings, "pomodoro", syncedState.completedFocusCycles, 0);
        }

        return getPhaseStartState(
            safeSettings,
            "pomodoro",
            Math.max(0, safeSettings.focusCycles - 1),
            0
        );
    }

    function applySettingsToTimerState(state, settings) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, Date.now());

        if (syncedState.isRunning) {
            return syncedState;
        }

        return {
            ...cloneState(syncedState),
            remainingSeconds: getModeDurationSeconds(safeSettings, syncedState.currentMode)
        };
    }

    function getCurrentPomodoroNumber(state) {
        const completedPomodorosInCycle = Math.min(
            toPositiveInteger(state.completedPomodorosInCycle, 0, 0, POMODOROS_PER_CYCLE),
            POMODOROS_PER_CYCLE
        );

        if (state.currentMode === "pomodoro") {
            return Math.min(completedPomodorosInCycle + 1, POMODOROS_PER_CYCLE);
        }

        return Math.max(1, completedPomodorosInCycle);
    }

    function getCurrentFocusCycleNumber(state, settings) {
        const safeSettings = normalizeSettings(settings);
        const safeState = normalizeTimerState(state, safeSettings);

        if (isFocusSessionFinished(safeState, safeSettings)) {
            return safeSettings.focusCycles;
        }

        return Math.min(safeState.completedFocusCycles + 1, safeSettings.focusCycles);
    }

    function getProjectedSessionEndTime(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        let simulatedState = hydrateTimerState(state, safeSettings, now);

        if (isFocusSessionFinished(simulatedState, safeSettings)) {
            return null;
        }

        if (!simulatedState.isRunning) {
            simulatedState = startTimerState(simulatedState, safeSettings, now);
        }

        let guard = 0;
        while (guard < 500) {
            if (!simulatedState.isRunning || !simulatedState.endTime) {
                return null;
            }

            const segmentEndTime = simulatedState.endTime;
            const nextState = transitionAfterCompletion(simulatedState, safeSettings, segmentEndTime);
            if (!nextState.isRunning) {
                return segmentEndTime;
            }

            simulatedState = nextState;
            guard += 1;
        }

        return null;
    }

    function areStatesEqual(firstState, secondState) {
        return firstState.currentMode === secondState.currentMode
            && firstState.isRunning === secondState.isRunning
            && firstState.endTime === secondState.endTime
            && firstState.remainingSeconds === secondState.remainingSeconds
            && firstState.completedPomodorosInCycle === secondState.completedPomodorosInCycle
            && firstState.completedFocusCycles === secondState.completedFocusCycles;
    }

    window.PomodoroTimerState = {
        keys: {
            SETTINGS_KEY,
            TIMER_STATE_KEY
        },
        getDefaultSettings: () => normalizeSettings(),
        normalizeSettings,
        getSettingsKey,
        getModeDurationSeconds,
        getDefaultTimerState,
        loadSettings,
        saveSettings,
        loadTimerState,
        saveTimerState,
        hydrateTimerState,
        startTimerState,
        pauseTimerState,
        resetTimerState,
        setModeState,
        skipToNextPhaseState,
        skipToPreviousPhaseState,
        applySettingsToTimerState,
        getRemainingSeconds,
        getCurrentPomodoroNumber,
        getCurrentFocusCycleNumber,
        getProjectedSessionEndTime,
        isFocusSessionFinished,
        getPomodorosPerCycle: () => POMODOROS_PER_CYCLE,
        areStatesEqual
    };
})();
