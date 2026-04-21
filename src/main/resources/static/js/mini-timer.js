document.addEventListener("DOMContentLoaded", () => {
    const timerStateStore = window.PomodoroTimerState;
    const miniTimer = document.getElementById("miniTimer");
    const miniTimerMode = document.getElementById("miniTimerMode");
    const miniTimerTime = document.getElementById("miniTimerTime");
    const miniTimerStatus = document.getElementById("miniTimerStatus");

    if (!timerStateStore || !miniTimer || !miniTimerMode || !miniTimerTime || !miniTimerStatus) return;

    const timerModeClasses = [
        "mini-timer--pomodoro",
        "mini-timer--short-break",
        "mini-timer--long-break"
    ];

    const labelText = {
        pomodoro: "Pomodoro",
        "short-break": "Short Break",
        "long-break": "Long Break"
    };

    let timerTick = null;
    let settings = timerStateStore.loadSettings();
    let timerState = timerStateStore.loadTimerState(settings);
    let initialTransitionsReleased = false;

    function releaseInitialTransitions() {
        if (initialTransitionsReleased) return;
        initialTransitionsReleased = true;

        const scheduleFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
        scheduleFrame(() => {
            scheduleFrame(() => {
                miniTimer.classList.remove("mini-timer--hydrating");
            });
        });
    }

    function formatTime(totalSeconds) {
        const safeSeconds = Math.max(0, totalSeconds);
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = safeSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    function setTicking(running) {
        if (running && !timerTick) {
            timerTick = window.setInterval(() => syncState(Date.now()), 1000);
            return;
        }

        if (!running && timerTick) {
            window.clearInterval(timerTick);
            timerTick = null;
        }
    }

    function getStatusText() {
        const remainingSeconds = timerStateStore.getRemainingSeconds(timerState);
        const fullModeSeconds = timerStateStore.getModeDurationSeconds(settings, timerState.currentMode);

        if (timerState.isRunning) {
            return "Running";
        }

        if (timerState.currentMode === "pomodoro" && remainingSeconds === fullModeSeconds) {
            return "Ready";
        }

        return "Paused";
    }

    function render() {
        miniTimer.classList.remove(...timerModeClasses);
        miniTimer.classList.add(`mini-timer--${timerState.currentMode}`);
        miniTimer.dataset.running = String(timerState.isRunning);

        miniTimerMode.textContent = labelText[timerState.currentMode] || "Timer";
        miniTimerTime.textContent = formatTime(timerStateStore.getRemainingSeconds(timerState));
        miniTimerStatus.textContent = getStatusText();
        miniTimer.setAttribute(
            "aria-label",
            `${miniTimerMode.textContent} ${miniTimerTime.textContent}, ${miniTimerStatus.textContent}. Open timer page`
        );

        setTicking(timerState.isRunning);
        releaseInitialTransitions();
    }

    function syncState(now = Date.now()) {
        const nextState = timerStateStore.hydrateTimerState(timerState, settings, now);
        const stateChanged = !timerStateStore.areStatesEqual(timerState, nextState);

        timerState = nextState;

        if (stateChanged) {
            timerState = timerStateStore.saveTimerState(timerState, settings);
        }

        render();
    }

    document.addEventListener("settings:updated", (event) => {
        settings = event.detail;
        timerState = timerStateStore.applySettingsToTimerState(timerState, settings);
        timerState = timerStateStore.saveTimerState(timerState, settings);
        render();
    });

    document.addEventListener("timer:state-updated", (event) => {
        settings = event.detail.settings;
        timerState = event.detail.state;
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

    render();
    syncState(Date.now());
});
