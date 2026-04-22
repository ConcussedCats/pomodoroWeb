document.addEventListener("DOMContentLoaded", () => {
    const timerStateStore = window.PomodoroTimerState;
    const timeDisplay = document.getElementById("timeDisplay");
    const startBtn = document.getElementById("startBtn");
    const resetBtn = document.getElementById("resetBtn");
    const prevCycleBtn = document.getElementById("prevCycleBtn");
    const nextCycleBtn = document.getElementById("nextCycleBtn");
    const sessionCountEl = document.getElementById("sessionCount");
    const sessionTotalEl = document.getElementById("sessionTotal");
    const sessionProjectionTextEl = document.getElementById("sessionProjectionText");
    const timerLabel = document.querySelector(".timer-label");
    const progressBar = document.querySelector(".timer-progress-bar");
    const modeLabels = document.querySelectorAll(".mode-label");
    const sessionDotsEl = document.getElementById("sessionDots");
    const timerSurface = document.getElementById("timerSection");
    const settingsToggle = document.getElementById("settingsToggle");
    const longBreakHint = document.getElementById("longBreakHint");
    const switchToLongBreakBtn = document.getElementById("switchToLongBreakBtn");
    const continueShortBreakBtn = document.getElementById("continueShortBreakBtn");

    if (!timerStateStore || !timeDisplay || !startBtn || !resetBtn || !timerLabel || !progressBar) return;

    const labelText = {
        pomodoro: "Focus Time",
        "short-break": "Short Break",
        "long-break": "Long Break"
    };
    const sessionTimeFormatter = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit"
    });

    let timerWorker = null;
    try {
        timerWorker = new Worker("js/worker.js");
    } catch (error) {
        console.warn("Web Workers require a server context (e.g., Live Server) to function.");
    }

    let settings = timerStateStore.loadSettings();
    let timerState = timerStateStore.loadTimerState(settings);
    let initialTransitionsReleased = false;
    let pendingManualMode = null;

    function releaseInitialTransitions() {
        if (!timerSurface || initialTransitionsReleased) return;
        initialTransitionsReleased = true;

        const scheduleFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
        scheduleFrame(() => {
            scheduleFrame(() => {
                timerSurface.classList.remove("timer-surface--hydrating");
            });
        });
    }

    function persistTimerState() {
        timerState = timerStateStore.saveTimerState(timerState, settings);
        document.dispatchEvent(new CustomEvent("timer:state-updated", {
            detail: {
                state: timerState,
                settings
            }
        }));
    }

    function playSound(fileName) {
        if (!settings.soundEnabled) return;
        const audio = new Audio(`assets/sounds/${fileName}`);
        audio.play().catch(() => {});
    }

    function setWorkerState(shouldRun) {
        if (timerWorker) {
            timerWorker.postMessage(shouldRun ? "start" : "stop");
            return;
        }

        if (shouldRun) {
            if (!window.fallbackTimer) {
                window.fallbackTimer = setInterval(onTimerTick, 1000);
            }
            return;
        }

        if (window.fallbackTimer) {
            clearInterval(window.fallbackTimer);
            window.fallbackTimer = null;
        }
    }

    function setSettingsButtonState(running) {
        if (!settingsToggle) return;
        settingsToggle.disabled = running;
        settingsToggle.setAttribute("aria-disabled", running ? "true" : "false");
    }

    function setModeButtonsState() {
        modeLabels.forEach((label) => {
            const isActive = label.dataset.mode === timerState.currentMode;
            label.disabled = timerState.sessionCompleted;
            label.setAttribute("aria-disabled", timerState.sessionCompleted ? "true" : "false");
            label.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function canResetTimer() {
        const defaultState = timerStateStore.getDefaultTimerState(settings);
        return !timerStateStore.areStatesEqual(timerState, defaultState);
    }

    function setResetButtonState(canReset) {
        resetBtn.disabled = !canReset;
        resetBtn.setAttribute("aria-disabled", canReset ? "false" : "true");
    }

    function setPhaseButtonStates() {
        if (prevCycleBtn) {
            const canMoveBack = timerStateStore.canSkipToPreviousPhase(timerState, settings);
            prevCycleBtn.disabled = !canMoveBack;
            prevCycleBtn.setAttribute("aria-disabled", canMoveBack ? "false" : "true");
        }

        if (nextCycleBtn) {
            const canMoveForward = timerStateStore.canSkipToNextPhase(timerState, settings);
            nextCycleBtn.disabled = !canMoveForward;
            nextCycleBtn.setAttribute("aria-disabled", canMoveForward ? "false" : "true");
        }
    }

    function updateProgress() {
        const totalSeconds = timerStateStore.getModeDurationSeconds(settings, timerState.currentMode);
        const remainingSeconds = timerStateStore.getRemainingSeconds(timerState);
        const progress = 1 - (remainingSeconds / totalSeconds);
        const safeProgress = Math.min(Math.max(progress, 0), 1);

        const circumference = 2 * Math.PI * 90;
        const offset = circumference * (1 - safeProgress);
        progressBar.style.strokeDasharray = `${circumference}`;
        progressBar.style.strokeDashoffset = `${offset}`;
    }

    function renderSessionDots(filledDots, totalDots) {
        if (!sessionDotsEl) return;

        const safeTotal = Math.max(1, totalDots);
        while (sessionDotsEl.children.length < safeTotal) {
            const dot = document.createElement("span");
            dot.className = "session-dot";
            sessionDotsEl.appendChild(dot);
        }

        while (sessionDotsEl.children.length > safeTotal) {
            sessionDotsEl.lastElementChild.remove();
        }

        Array.from(sessionDotsEl.children).forEach((dot, index) => {
            dot.classList.toggle("session-dot--active", index < filledDots);
        });
    }

    function render() {
        const remainingSeconds = timerStateStore.getRemainingSeconds(timerState);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        const currentFocusCycle = timerStateStore.getCurrentCycleNumber(timerState, settings);
        const projectedSessionEndTime = timerStateStore.getProjectedSessionEndTime(timerState, settings);
        const focusSessionFinished = timerStateStore.isFocusSessionFinished(timerState, settings);
        const filledDots = timerStateStore.getFilledDotsCount(timerState, settings);
        const totalDots = timerStateStore.getWorkPhasesPerCycle(settings);

        timeDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        timerLabel.textContent = focusSessionFinished
            ? "Session Complete"
            : (labelText[timerState.currentMode] || "Timer");
        startBtn.querySelector(".btn-text").textContent = timerState.isRunning
            ? "PAUSE FLOW"
            : (focusSessionFinished ? "START AGAIN" : "START FLOW");
        if (sessionCountEl) {
            sessionCountEl.textContent = String(currentFocusCycle);
        }
        if (sessionTotalEl) {
            sessionTotalEl.textContent = String(settings.focusCycles);
        }
        if (sessionProjectionTextEl) {
            if (focusSessionFinished) {
                sessionProjectionTextEl.textContent = "Focus session complete";
            } else if (projectedSessionEndTime) {
                sessionProjectionTextEl.textContent = `Session ends at ${sessionTimeFormatter.format(new Date(projectedSessionEndTime))}`;
            } else {
                sessionProjectionTextEl.textContent = "Session ends at --:--";
            }
        }

        modeLabels.forEach(label => {
            label.classList.toggle("mode-label--active", label.dataset.mode === timerState.currentMode);
        });
        renderSessionDots(filledDots, totalDots);
        if (timerSurface) {
            timerSurface.dataset.mode = timerState.currentMode;
        }

        setSettingsButtonState(timerState.isRunning);
        setModeButtonsState();
        setResetButtonState(canResetTimer());
        setPhaseButtonStates();
        updateProgress();
        setWorkerState(timerState.isRunning);
        releaseInitialTransitions();
    }

    function closeLongBreakHint() {
        if (!longBreakHint) return;
        longBreakHint.classList.add("hidden");
        pendingManualMode = null;
    }

    function openLongBreakHint() {
        if (!longBreakHint) return;
        longBreakHint.classList.remove("hidden");
    }

    function applyManualMode(targetMode) {
        if (!targetMode) return;

        const nextState = timerStateStore.manualSwitchToModeState(timerState, settings, targetMode, Date.now());
        if (timerStateStore.areStatesEqual(timerState, nextState)) return;

        timerState = nextState;
        persistTimerState();
        render();
    }

    function syncTimerState(now = Date.now(), shouldPlaySounds = true) {
        const previousState = timerState;
        const nextState = timerStateStore.hydrateTimerState(timerState, settings, now);
        const stateChanged = !timerStateStore.areStatesEqual(previousState, nextState);

        timerState = nextState;

        if (stateChanged && shouldPlaySounds) {
            if (previousState.currentMode === "pomodoro" && nextState.currentMode !== "pomodoro") {
                playSound("timer_sound_down.wav");
            } else if (previousState.currentMode !== "pomodoro" && nextState.currentMode === "pomodoro") {
                playSound("timer_sound_up.wav");
            }
        }

        if (stateChanged) {
            persistTimerState();
        }

        render();
    }

    function onTimerTick() {
        if (!timerState.isRunning) return;
        syncTimerState(Date.now(), true);
    }

    if (timerWorker) {
        timerWorker.onmessage = (event) => {
            if (event.data === "tick") {
                onTimerTick();
            }
        };
    }

    startBtn.addEventListener("click", () => {
        const now = Date.now();

        if (timerState.isRunning) {
            timerState = timerStateStore.pauseTimerState(timerState, settings, now);
            playSound("timer_sound_down.wav");
        } else {
            timerState = timerStateStore.startTimerState(timerState, settings, now);
            playSound("timer_sound_up.wav");
        }

        persistTimerState();
        render();
    });

    resetBtn.addEventListener("click", () => {
        if (!canResetTimer()) return;

        playSound("timer_sound_down.wav");
        timerState = timerStateStore.resetTimerState(timerState, settings);
        persistTimerState();
        render();
    });

    prevCycleBtn?.addEventListener("click", () => {
        if (!timerStateStore.canSkipToPreviousPhase(timerState, settings)) return;

        playSound("timer_sound_up.wav");
        timerState = timerStateStore.skipToPreviousPhaseState(timerState, settings, Date.now());
        persistTimerState();
        render();
    });

    nextCycleBtn?.addEventListener("click", () => {
        if (!timerStateStore.canSkipToNextPhase(timerState, settings)) return;
        playSound("timer_sound_down.wav");
        timerState = timerStateStore.skipToNextPhaseState(timerState, settings, Date.now());
        persistTimerState();
        render();
    });

    modeLabels.forEach((label) => {
        label.addEventListener("click", () => {
            if (timerState.sessionCompleted) return;

            const targetMode = label.dataset.mode;
            if (!targetMode || targetMode === timerState.currentMode) return;

            if (timerStateStore.shouldWarnBeforeShortBreakOverride(timerState, settings, targetMode)) {
                pendingManualMode = targetMode;
                openLongBreakHint();
                return;
            }

            playSound(targetMode === "pomodoro" ? "timer_sound_up.wav" : "timer_sound_down.wav");
            applyManualMode(targetMode);
        });
    });

    switchToLongBreakBtn?.addEventListener("click", () => {
        closeLongBreakHint();
        playSound("timer_sound_down.wav");
        applyManualMode("long-break");
    });

    continueShortBreakBtn?.addEventListener("click", () => {
        const targetMode = pendingManualMode || "short-break";
        closeLongBreakHint();
        playSound("timer_sound_down.wav");
        applyManualMode(targetMode);
    });

    longBreakHint?.addEventListener("click", (event) => {
        if (event.target === longBreakHint) {
            closeLongBreakHint();
        }
    });

    document.addEventListener("settings:updated", (event) => {
        settings = event.detail;
        timerState = timerStateStore.applySettingsToTimerState(timerState, settings);
        persistTimerState();
        render();
    });

    window.addEventListener("storage", (event) => {
        if (event.key === timerStateStore.keys.SETTINGS_KEY) {
            settings = timerStateStore.loadSettings();
        }

        if (event.key === timerStateStore.keys.TIMER_STATE_KEY || event.key === timerStateStore.keys.SETTINGS_KEY) {
            timerState = timerStateStore.loadTimerState(settings);
            render();
        }
    });

    persistTimerState();
    syncTimerState(Date.now(), false);
});
