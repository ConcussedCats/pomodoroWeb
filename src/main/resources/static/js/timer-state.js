(function () {
    const SETTINGS_KEY = "pomodoroSettings";
    const TIMER_STATE_KEY = "pomodoroTimerState";
    const MANUAL_MODE_MEMORY_CLEAR_DELAY_MS = 10_000;

    const PATTERN_TYPES = ["classic", "compact"];
    const VALID_MODES = ["pomodoro", "short-break", "long-break"];

    const DEFAULT_SETTINGS = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        soundEnabled: true,
        focusCycles: 4,
        patternType: "classic"
    };

    const PHASE_PATTERNS = {
        classic: [
            { mode: "pomodoro", workIndexInCycle: 1, durationSource: "pomodoro" },
            { mode: "short-break", workIndexInCycle: null, durationSource: "shortBreak" },
            { mode: "pomodoro", workIndexInCycle: 2, durationSource: "pomodoro" },
            { mode: "short-break", workIndexInCycle: null, durationSource: "shortBreak" },
            { mode: "pomodoro", workIndexInCycle: 3, durationSource: "pomodoro" },
            { mode: "short-break", workIndexInCycle: null, durationSource: "shortBreak" },
            { mode: "pomodoro", workIndexInCycle: 4, durationSource: "pomodoro" },
            { mode: "long-break", workIndexInCycle: null, durationSource: "longBreak" }
        ],
        compact: [
            { mode: "pomodoro", workIndexInCycle: 1, durationSource: "pomodoro" },
            { mode: "short-break", workIndexInCycle: null, durationSource: "shortBreak" },
            { mode: "pomodoro", workIndexInCycle: 2, durationSource: "pomodoro" },
            { mode: "long-break", workIndexInCycle: null, durationSource: "longBreak" }
        ]
    };

    function toPositiveInteger(value, fallback, min = 1, max = Number.POSITIVE_INFINITY) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < min) {
            return fallback;
        }
        return Math.min(parsed, max);
    }

    function normalizePatternType(value) {
        return PATTERN_TYPES.includes(value) ? value : DEFAULT_SETTINGS.patternType;
    }

    function normalizeSettings(settings = {}) {
        return {
            pomodoro: toPositiveInteger(settings.pomodoro, DEFAULT_SETTINGS.pomodoro, 1, 120),
            shortBreak: toPositiveInteger(settings.shortBreak, DEFAULT_SETTINGS.shortBreak, 1, 30),
            longBreak: toPositiveInteger(settings.longBreak, DEFAULT_SETTINGS.longBreak, 1, 80),
            soundEnabled: settings.soundEnabled !== false,
            focusCycles: toPositiveInteger(settings.focusCycles, DEFAULT_SETTINGS.focusCycles, 1, 12),
            patternType: normalizePatternType(settings.patternType)
        };
    }

    function getPatternPhases(patternTypeOrSettings) {
        const patternType = typeof patternTypeOrSettings === "string"
            ? normalizePatternType(patternTypeOrSettings)
            : normalizeSettings(patternTypeOrSettings).patternType;

        return PHASE_PATTERNS[patternType].map(phase => ({ ...phase }));
    }

    function getWorkPhasesPerCycle(patternTypeOrSettings) {
        return getPatternPhases(patternTypeOrSettings).filter(phase => phase.mode === "pomodoro").length;
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

    function normalizeRemainingSecondsByMode(settings, remainingSecondsByMode = {}) {
        const safeSettings = normalizeSettings(settings);

        return VALID_MODES.reduce((remainingByMode, mode) => {
            const rawRemainingSeconds = Number.parseInt(remainingSecondsByMode[mode], 10);
            remainingByMode[mode] = Number.isFinite(rawRemainingSeconds) && rawRemainingSeconds >= 0
                ? rawRemainingSeconds
                : getModeDurationSeconds(safeSettings, mode);
            return remainingByMode;
        }, {});
    }

    function resetRemainingSecondsByMode(settings, currentMode, currentRemainingSeconds) {
        return {
            ...normalizeRemainingSecondsByMode(settings),
            [currentMode]: Math.max(0, currentRemainingSeconds)
        };
    }

    function isBreakMode(mode) {
        return mode === "short-break" || mode === "long-break";
    }

    function getPhaseForPosition(settings, cycleIndex, phaseIndex) {
        const safeSettings = normalizeSettings(settings);
        const phases = getPatternPhases(safeSettings);
        const safeCycleIndex = Math.min(Math.max(0, cycleIndex), safeSettings.focusCycles - 1);
        const safePhaseIndex = Math.min(Math.max(0, phaseIndex), phases.length - 1);
        const phase = phases[safePhaseIndex];

        return {
            ...phase,
            cycleIndex: safeCycleIndex,
            phaseIndex: safePhaseIndex,
            totalCycles: safeSettings.focusCycles,
            patternType: safeSettings.patternType,
            totalPhases: phases.length,
            totalWorkPhases: getWorkPhasesPerCycle(safeSettings)
        };
    }

    function getPhaseDurationSeconds(settings, phase) {
        return getModeDurationSeconds(settings, phase.mode);
    }

    function createPhaseState(settings, cycleIndex, phaseIndex, options = {}) {
        const phase = getPhaseForPosition(settings, cycleIndex, phaseIndex);
        const fullDurationSeconds = getPhaseDurationSeconds(settings, phase);
        const remainingSeconds = Number.isFinite(options.remainingSeconds)
            ? Math.max(0, options.remainingSeconds)
            : fullDurationSeconds;
        const isRunning = Boolean(options.isRunning);
        const endTime = isRunning
            ? (Number(options.endTime) || (Date.now() + (remainingSeconds * 1000)))
            : null;

        return {
            patternType: phase.patternType,
            currentCycleIndex: phase.cycleIndex,
            currentPhaseIndex: phase.phaseIndex,
            currentMode: phase.mode,
            isRunning,
            endTime,
            remainingSeconds,
            remainingSecondsByMode: {
                ...normalizeRemainingSecondsByMode(settings, options.remainingSecondsByMode),
                [phase.mode]: remainingSeconds
            },
            manualModeMemoryClearAt: Number.isFinite(options.manualModeMemoryClearAt)
                ? options.manualModeMemoryClearAt
                : null,
            sessionCompleted: Boolean(options.sessionCompleted)
        };
    }

    function getCompletedSessionState(settings) {
        const safeSettings = normalizeSettings(settings);
        const lastPhaseIndex = getPatternPhases(safeSettings).length - 1;
        const state = createPhaseState(safeSettings, safeSettings.focusCycles - 1, lastPhaseIndex, {
            remainingSeconds: 0,
            sessionCompleted: true
        });

        return {
            ...state,
            isRunning: false,
            endTime: null
        };
    }

    function getDefaultTimerState(settings) {
        return createPhaseState(settings, 0, 0, {
            isRunning: false
        });
    }

    function migrateLegacyState(state, settings) {
        if (
            typeof state.currentCycleIndex === "number"
            && typeof state.currentPhaseIndex === "number"
            && typeof state.sessionCompleted === "boolean"
        ) {
            return state;
        }

        const safeSettings = normalizeSettings(settings);
        const phases = getPatternPhases(safeSettings);
        const legacyMode = VALID_MODES.includes(state.currentMode) ? state.currentMode : "pomodoro";
        const legacyCycleIndex = Math.min(
            Math.max(0, Number.parseInt(state.completedFocusCycles, 10) || 0),
            safeSettings.focusCycles - 1
        );
        const completedWorkPhases = Math.min(
            Math.max(0, Number.parseInt(state.completedPomodorosInCycle, 10) || 0),
            getWorkPhasesPerCycle(safeSettings)
        );

        let currentPhaseIndex = 0;
        if (legacyMode === "pomodoro") {
            currentPhaseIndex = Math.min(completedWorkPhases * 2, phases.length - 1);
        } else if (legacyMode === "short-break") {
            currentPhaseIndex = Math.min(Math.max(1, (completedWorkPhases * 2) - 1), phases.length - 1);
        } else {
            currentPhaseIndex = phases.length - 1;
        }

        return {
            ...state,
            patternType: safeSettings.patternType,
            currentCycleIndex: legacyCycleIndex,
            currentPhaseIndex,
            sessionCompleted: false
        };
    }

    function normalizeTimerState(state = {}, settings) {
        const safeSettings = normalizeSettings(settings);
        const fallback = getDefaultTimerState(safeSettings);
        const migratedState = migrateLegacyState(state, safeSettings);
        const phases = getPatternPhases(safeSettings);
        const currentCycleIndex = Math.min(
            Math.max(0, Number.parseInt(migratedState.currentCycleIndex, 10) || 0),
            safeSettings.focusCycles - 1
        );
        const currentPhaseIndex = Math.min(
            Math.max(0, Number.parseInt(migratedState.currentPhaseIndex, 10) || 0),
            phases.length - 1
        );
        const phase = phases[currentPhaseIndex];
        const fullDurationSeconds = getPhaseDurationSeconds(safeSettings, phase);
        const rawRemainingSeconds = Number.parseInt(migratedState.remainingSeconds, 10);
        const sessionCompleted = Boolean(migratedState.sessionCompleted);
        const remainingSeconds = sessionCompleted
            ? 0
            : (Number.isFinite(rawRemainingSeconds) && rawRemainingSeconds >= 0
                ? rawRemainingSeconds
                : fullDurationSeconds);
        const isRunning = !sessionCompleted && Boolean(migratedState.isRunning);
        const rawEndTime = Number(migratedState.endTime);
        const endTime = isRunning && Number.isFinite(rawEndTime) ? rawEndTime : null;
        const rawManualModeMemoryClearAt = Number(migratedState.manualModeMemoryClearAt);
        const manualModeMemoryClearAt = isRunning && Number.isFinite(rawManualModeMemoryClearAt)
            ? rawManualModeMemoryClearAt
            : null;

        return {
            patternType: safeSettings.patternType,
            currentCycleIndex,
            currentPhaseIndex,
            currentMode: VALID_MODES.includes(migratedState.currentMode)
                ? migratedState.currentMode
                : (phase?.mode || fallback.currentMode),
            isRunning,
            endTime,
            remainingSeconds,
            remainingSecondsByMode: {
                ...normalizeRemainingSecondsByMode(safeSettings, migratedState.remainingSecondsByMode),
                [VALID_MODES.includes(migratedState.currentMode)
                    ? migratedState.currentMode
                    : (phase?.mode || fallback.currentMode)]: remainingSeconds
            },
            manualModeMemoryClearAt,
            sessionCompleted
        };
    }

    function cloneState(state) {
        return {
            patternType: state.patternType,
            currentCycleIndex: state.currentCycleIndex,
            currentPhaseIndex: state.currentPhaseIndex,
            currentMode: state.currentMode,
            isRunning: state.isRunning,
            endTime: state.endTime,
            remainingSeconds: state.remainingSeconds,
            remainingSecondsByMode: state.remainingSecondsByMode
                ? { ...state.remainingSecondsByMode }
                : undefined,
            manualModeMemoryClearAt: state.manualModeMemoryClearAt,
            sessionCompleted: state.sessionCompleted
        };
    }

    function getCurrentPhase(state, settings) {
        const safeSettings = normalizeSettings(settings);
        const safeState = normalizeTimerState(state, safeSettings);
        return getPhaseForPosition(safeSettings, safeState.currentCycleIndex, safeState.currentPhaseIndex);
    }

    function getRemainingSeconds(state, now = Date.now()) {
        if (state.sessionCompleted) {
            return 0;
        }

        if (!state.isRunning || !state.endTime) {
            return Math.max(0, state.remainingSeconds);
        }

        return Math.max(0, Math.ceil((state.endTime - now) / 1000));
    }

    function isFocusSessionFinished(state, settings) {
        return normalizeTimerState(state, settings).sessionCompleted;
    }

    function moveToPhase(settings, cycleIndex, phaseIndex, now, shouldAutoStart) {
        const phase = getPhaseForPosition(settings, cycleIndex, phaseIndex);
        const remainingSeconds = getPhaseDurationSeconds(settings, phase);

        return createPhaseState(settings, phase.cycleIndex, phase.phaseIndex, {
            isRunning: shouldAutoStart,
            remainingSeconds,
            endTime: shouldAutoStart ? now + (remainingSeconds * 1000) : null
        });
    }

    function getNextPhasePosition(settings, cycleIndex, phaseIndex) {
        const safeSettings = normalizeSettings(settings);
        const phases = getPatternPhases(safeSettings);

        if (phaseIndex < phases.length - 1) {
            return {
                cycleIndex,
                phaseIndex: phaseIndex + 1
            };
        }

        if (cycleIndex < safeSettings.focusCycles - 1) {
            return {
                cycleIndex: cycleIndex + 1,
                phaseIndex: 0
            };
        }

        return null;
    }

    function getModeForPosition(settings, position) {
        if (!position) {
            return null;
        }

        return getPhaseForPosition(settings, position.cycleIndex, position.phaseIndex).mode;
    }

    function transitionAfterCompletion(state, settings, completedAt) {
        const safeSettings = normalizeSettings(settings);
        const safeState = normalizeTimerState(state, safeSettings);

        if (safeState.sessionCompleted) {
            return safeState;
        }

        const basePhase = getCurrentPhase(safeState, safeSettings);
        let nextPosition = getNextPhasePosition(
            safeSettings,
            safeState.currentCycleIndex,
            safeState.currentPhaseIndex
        );

        if (safeState.currentMode !== basePhase.mode && nextPosition) {
            const nextMode = getModeForPosition(safeSettings, nextPosition);
            const shouldSkipBreak = isBreakMode(safeState.currentMode) && isBreakMode(nextMode);
            const shouldSkipWork = safeState.currentMode === "pomodoro" && nextMode === "pomodoro";

            if (shouldSkipBreak || shouldSkipWork) {
                nextPosition = getNextPhasePosition(safeSettings, nextPosition.cycleIndex, nextPosition.phaseIndex);
            }
        }

        if (!nextPosition) {
            return getCompletedSessionState(safeSettings);
        }

        return moveToPhase(
            safeSettings,
            nextPosition.cycleIndex,
            nextPosition.phaseIndex,
            completedAt,
            true
        );
    }

    function hydrateTimerState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        let nextState = normalizeTimerState(state, safeSettings);

        if (nextState.sessionCompleted) {
            return nextState;
        }

        if (!nextState.isRunning) {
            nextState.remainingSeconds = Math.max(0, nextState.remainingSeconds);
            nextState.remainingSecondsByMode = {
                ...normalizeRemainingSecondsByMode(safeSettings, nextState.remainingSecondsByMode),
                [nextState.currentMode]: nextState.remainingSeconds
            };
            nextState.manualModeMemoryClearAt = null;
            return nextState;
        }

        let guard = 0;
        while (nextState.isRunning && nextState.endTime && nextState.endTime <= now && guard < 200) {
            nextState = transitionAfterCompletion(nextState, safeSettings, nextState.endTime);
            guard += 1;
        }

        nextState.remainingSeconds = getRemainingSeconds(nextState, now);
        if (nextState.manualModeMemoryClearAt && now >= nextState.manualModeMemoryClearAt) {
            nextState.remainingSecondsByMode = resetRemainingSecondsByMode(
                safeSettings,
                nextState.currentMode,
                nextState.remainingSeconds
            );
            nextState.manualModeMemoryClearAt = null;
        } else {
            nextState.remainingSecondsByMode = {
                ...normalizeRemainingSecondsByMode(safeSettings, nextState.remainingSecondsByMode),
                [nextState.currentMode]: nextState.remainingSeconds
            };
        }
        return nextState;
    }

    function startTimerState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        let syncedState = hydrateTimerState(state, safeSettings, now);

        if (syncedState.sessionCompleted) {
            syncedState = getDefaultTimerState(safeSettings);
        }

        if (syncedState.isRunning) {
            return syncedState;
        }

        const remainingSeconds = syncedState.remainingSeconds > 0
            ? syncedState.remainingSeconds
            : getPhaseDurationSeconds(safeSettings, getCurrentPhase(syncedState, safeSettings));

        return {
            ...cloneState(syncedState),
            isRunning: true,
            endTime: now + (remainingSeconds * 1000),
            remainingSeconds,
            remainingSecondsByMode: {
                ...normalizeRemainingSecondsByMode(safeSettings, syncedState.remainingSecondsByMode),
                [syncedState.currentMode]: remainingSeconds
            },
            manualModeMemoryClearAt: now + MANUAL_MODE_MEMORY_CLEAR_DELAY_MS
        };
    }

    function pauseTimerState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, now);

        if (!syncedState.isRunning) {
            return {
                ...cloneState(syncedState),
                endTime: null,
                remainingSecondsByMode: {
                    ...normalizeRemainingSecondsByMode(safeSettings, syncedState.remainingSecondsByMode),
                    [syncedState.currentMode]: syncedState.remainingSeconds
                },
                manualModeMemoryClearAt: null
            };
        }

        const remainingSeconds = getRemainingSeconds(syncedState, now);

        return {
            ...cloneState(syncedState),
            isRunning: false,
            endTime: null,
            remainingSeconds,
            remainingSecondsByMode: {
                ...normalizeRemainingSecondsByMode(safeSettings, syncedState.remainingSecondsByMode),
                [syncedState.currentMode]: remainingSeconds
            },
            manualModeMemoryClearAt: null
        };
    }

    function resetTimerState(state, settings) {
        return getDefaultTimerState(settings);
    }

    function canSkipToNextPhase(state, settings) {
        return !normalizeTimerState(state, settings).sessionCompleted;
    }

    function canSkipToPreviousPhase(state, settings) {
        const safeState = normalizeTimerState(state, settings);
        return safeState.currentPhaseIndex > 0 || safeState.currentCycleIndex > 0;
    }

    function skipToNextPhaseState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, now);

        if (syncedState.sessionCompleted) {
            return syncedState;
        }

        return transitionAfterCompletion({
            ...cloneState(syncedState),
            isRunning: true,
            endTime: now
        }, safeSettings, now);
    }

    function skipToPreviousPhaseState(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, now);

        if (syncedState.currentPhaseIndex === 0 && syncedState.currentCycleIndex === 0) {
            return syncedState;
        }

        if (syncedState.currentPhaseIndex > 0) {
            return moveToPhase(
                safeSettings,
                syncedState.currentCycleIndex,
                syncedState.currentPhaseIndex - 1,
                now,
                true
            );
        }

        return moveToPhase(
            safeSettings,
            syncedState.currentCycleIndex - 1,
            getPatternPhases(safeSettings).length - 1,
            now,
            true
        );
    }

    function manualSwitchToModeState(state, settings, targetMode, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, now);

        if (syncedState.sessionCompleted || !VALID_MODES.includes(targetMode)) {
            return syncedState;
        }

        const rememberedRemainingSeconds = {
            ...normalizeRemainingSecondsByMode(safeSettings, syncedState.remainingSecondsByMode),
            [syncedState.currentMode]: getRemainingSeconds(syncedState, now)
        };
        const remainingSeconds = rememberedRemainingSeconds[targetMode];

        return {
            ...cloneState(syncedState),
            currentMode: targetMode,
            remainingSeconds,
            remainingSecondsByMode: {
                ...rememberedRemainingSeconds,
                [targetMode]: remainingSeconds
            },
            manualModeMemoryClearAt: syncedState.manualModeMemoryClearAt,
            endTime: syncedState.isRunning ? now + (remainingSeconds * 1000) : null
        };
    }

    function shouldWarnBeforeShortBreakOverride(state, settings, targetMode) {
        if (targetMode !== "short-break") {
            return false;
        }

        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, Date.now());
        const basePhase = getCurrentPhase(syncedState, safeSettings);

        if (basePhase.mode !== "pomodoro") {
            return false;
        }

        const nextPosition = getNextPhasePosition(
            safeSettings,
            syncedState.currentCycleIndex,
            syncedState.currentPhaseIndex
        );

        return getModeForPosition(safeSettings, nextPosition) === "long-break";
    }

    function applySettingsToTimerState(state, settings) {
        const safeSettings = normalizeSettings(settings);
        const syncedState = hydrateTimerState(state, safeSettings, Date.now());

        if (syncedState.isRunning) {
            return syncedState;
        }

        return getDefaultTimerState(safeSettings);
    }

    function getCurrentPomodoroNumber(state, settings) {
        return getFilledDotsCount(state, settings);
    }

    function getCurrentCycleNumber(state, settings) {
        const safeSettings = normalizeSettings(settings);
        const safeState = normalizeTimerState(state, safeSettings);
        return safeState.sessionCompleted
            ? safeSettings.focusCycles
            : Math.min(safeState.currentCycleIndex + 1, safeSettings.focusCycles);
    }

    function getCurrentFocusCycleNumber(state, settings) {
        return getCurrentCycleNumber(state, settings);
    }

    function getFilledDotsCount(state, settings) {
        const safeSettings = normalizeSettings(settings);
        const safeState = normalizeTimerState(state, safeSettings);

        if (safeState.sessionCompleted) {
            return getWorkPhasesPerCycle(safeSettings);
        }

        const phase = getCurrentPhase(safeState, safeSettings);
        if (phase.mode === "pomodoro") {
            return phase.workIndexInCycle || 1;
        }

        if (phase.mode === "long-break") {
            return getWorkPhasesPerCycle(safeSettings);
        }

        const phases = getPatternPhases(safeSettings);
        for (let index = phase.phaseIndex; index >= 0; index -= 1) {
            if (phases[index].mode === "pomodoro") {
                return phases[index].workIndexInCycle || 1;
            }
        }

        return 1;
    }

    function getProjectedSessionEndTime(state, settings, now = Date.now()) {
        const safeSettings = normalizeSettings(settings);
        let simulatedState = hydrateTimerState(state, safeSettings, now);

        if (simulatedState.sessionCompleted) {
            return null;
        }

        if (!simulatedState.isRunning) {
            simulatedState = startTimerState(simulatedState, safeSettings, now);
        }

        let guard = 0;
        while (guard < 500) {
            if (simulatedState.sessionCompleted) {
                return null;
            }

            if (!simulatedState.isRunning || !simulatedState.endTime) {
                return null;
            }

            const segmentEndTime = simulatedState.endTime;
            const nextState = transitionAfterCompletion(simulatedState, safeSettings, segmentEndTime);
            if (nextState.sessionCompleted) {
                return segmentEndTime;
            }

            simulatedState = nextState;
            guard += 1;
        }

        return null;
    }

    function areStatesEqual(firstState, secondState) {
        return firstState.patternType === secondState.patternType
            && firstState.currentCycleIndex === secondState.currentCycleIndex
            && firstState.currentPhaseIndex === secondState.currentPhaseIndex
            && firstState.currentMode === secondState.currentMode
            && firstState.isRunning === secondState.isRunning
            && firstState.endTime === secondState.endTime
            && firstState.remainingSeconds === secondState.remainingSeconds
            && VALID_MODES.every(mode => firstState.remainingSecondsByMode?.[mode] === secondState.remainingSecondsByMode?.[mode])
            && firstState.manualModeMemoryClearAt === secondState.manualModeMemoryClearAt
            && firstState.sessionCompleted === secondState.sessionCompleted;
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

    window.PomodoroTimerState = {
        keys: {
            SETTINGS_KEY,
            TIMER_STATE_KEY
        },
        getDefaultSettings: () => normalizeSettings(),
        normalizePatternType,
        normalizeSettings,
        getPatternPhases,
        getWorkPhasesPerCycle,
        getSettingsKey,
        getModeDurationSeconds,
        getDefaultTimerState,
        getCurrentPhase,
        loadSettings,
        saveSettings,
        loadTimerState,
        saveTimerState,
        hydrateTimerState,
        startTimerState,
        pauseTimerState,
        resetTimerState,
        skipToNextPhaseState,
        skipToPreviousPhaseState,
        manualSwitchToModeState,
        canSkipToNextPhase,
        canSkipToPreviousPhase,
        applySettingsToTimerState,
        getRemainingSeconds,
        getCurrentPomodoroNumber,
        getCurrentFocusCycleNumber,
        getCurrentCycleNumber,
        getFilledDotsCount,
        getProjectedSessionEndTime,
        isFocusSessionFinished,
        areStatesEqual,
        shouldWarnBeforeShortBreakOverride
    };
})();
