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

    // Connected Device Mode: show the cube timer instead of the browser timer (connected-state.js).
    const connectedState = window.TelosConnectedState;
    let connectedSnapshot = connectedState?.getActiveDeviceId()
        ? connectedState.loadSnapshot(connectedState.getActiveDeviceId())
        : null;

    let timerTick = null;
    let settings = timerStateStore.loadSettings();
    let timerState = timerStateStore.loadTimerState(settings);
    let initialTransitionsReleased = false;
    const soundCache = new Map();

    function preloadSound(fileName) {
        if (soundCache.has(fileName)) {
            return soundCache.get(fileName);
        }

        const audio = new Audio(`assets/sounds/${fileName}`);
        audio.preload = "auto";
        audio.load();
        soundCache.set(fileName, audio);
        return audio;
    }

    function playSound(fileName) {
        if (!settings.soundEnabled) return;
        const audio = preloadSound(fileName);
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    function playCompletionSound(previousState, nextState) {
        if (previousState.currentMode === "pomodoro" && nextState.currentMode !== "pomodoro") {
            playSound("timer_sound_down.wav");
        } else if (previousState.currentMode !== "pomodoro" && nextState.currentMode === "pomodoro") {
            playSound("timer_sound_up.wav");
        }
    }

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
        if (timerState.sessionCompleted) {
            return "Completed";
        }

        if (timerState.isRunning) {
            return "Running";
        }

        const remainingSeconds = timerStateStore.getRemainingSeconds(timerState);
        const fullModeSeconds = timerStateStore.getModeDurationSeconds(settings, timerState.currentMode);

        if (
            timerState.currentMode === "pomodoro"
            && timerState.currentCycleIndex === 0
            && timerState.currentPhaseIndex === 0
            && remainingSeconds === fullModeSeconds
        ) {
            return "Ready";
        }

        return "Paused";
    }

    function isConnectedMode() {
        return Boolean(connectedState?.getActiveDeviceId());
    }

    function renderConnected() {
        const view = connectedState.toView(connectedSnapshot?.state, connectedSnapshot?.offsetMs);
        miniTimer.classList.remove(...timerModeClasses);
        miniTimer.classList.add(`mini-timer--${view.webMode}`);
        miniTimer.dataset.running = String(view.isRunning);
        miniTimerMode.textContent = connectedSnapshot ? (labelText[view.webMode] || "Timer") : "Cube";
        miniTimerTime.textContent = formatTime(view.remainingSeconds);
        miniTimerStatus.textContent = `Cube · ${view.statusText}`;
        miniTimer.setAttribute(
            "aria-label",
            `Cube timer ${miniTimerMode.textContent} ${miniTimerTime.textContent}, ${view.statusText}. Open timer page`
        );
        setTicking(view.isRunning);
        releaseInitialTransitions();
    }

    async function refreshConnected() {
        const deviceId = connectedState?.getActiveDeviceId();
        if (!deviceId) {
            connectedSnapshot = null;
            render();
            return;
        }
        try {
            const result = await connectedState.fetchState(deviceId);
            connectedSnapshot = result;
            connectedState.saveSnapshot(result.state, result.offsetMs);
        } catch (error) {
            if (error.status === 404 || error.status === 401) {
                connectedState.setActiveDeviceId(null);
                connectedSnapshot = null;
            }
        }
        render();
    }

    function render() {
        if (isConnectedMode()) {
            renderConnected();
            return;
        }

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
        const previousState = timerState;
        const nextState = timerStateStore.hydrateTimerState(timerState, settings, now);
        const stateChanged = !timerStateStore.areStatesEqual(previousState, nextState);

        timerState = nextState;

        if (stateChanged) {
            playCompletionSound(previousState, nextState);
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
        if (connectedState && (event.key === connectedState.keys.ACTIVE_DEVICE_KEY
            || event.key === connectedState.keys.SNAPSHOT_KEY)) {
            const deviceId = connectedState.getActiveDeviceId();
            connectedSnapshot = deviceId ? connectedState.loadSnapshot(deviceId) : null;
            render();
            return;
        }

        if (event.key === timerStateStore.keys.SETTINGS_KEY) {
            settings = timerStateStore.loadSettings();
        }

        if (event.key === timerStateStore.keys.TIMER_STATE_KEY || event.key === timerStateStore.keys.SETTINGS_KEY) {
            timerState = timerStateStore.loadTimerState(settings);
            render();
        }
    });

    if (connectedState && window.TelosDeviceLive) {
        const lastCubeVersion = new Map();
        window.TelosDeviceLive.subscribe((message) => {
            const deviceId = connectedState.getActiveDeviceId();
            if (!deviceId && message.type === "TIMER_STATE") {
                // The cube was flipped while this page shows the browser timer: the cube takes over.
                const known = lastCubeVersion.get(message.deviceId) ?? -1;
                lastCubeVersion.set(message.deviceId, Number(message.state.version));
                if (message.state.status === "RUNNING" && Number(message.state.version) > known) {
                    if (timerState.isRunning) {
                        timerState = timerStateStore.saveTimerState(
                            timerStateStore.pauseTimerState(timerState, settings, Date.now()),
                            settings
                        );
                    }
                    connectedState.setActiveDeviceId(message.deviceId);
                    connectedSnapshot = { state: message.state, offsetMs: connectedState.computeClockOffset(message.state) };
                    connectedState.saveSnapshot(connectedSnapshot.state, connectedSnapshot.offsetMs);
                    render();
                }
                return;
            }
            if (!deviceId) return;
            if (message.type === "RESYNC") {
                refreshConnected();
            } else if (message.type === "TIMER_STATE" && message.deviceId === deviceId
                && connectedState.isNewer(message.state, connectedSnapshot?.state)) {
                connectedSnapshot = { state: message.state, offsetMs: connectedState.computeClockOffset(message.state) };
                connectedState.saveSnapshot(connectedSnapshot.state, connectedSnapshot.offsetMs);
                render();
            } else if (message.type === "DEVICE_REMOVED" && message.deviceId === deviceId) {
                connectedState.setActiveDeviceId(null);
                connectedSnapshot = null;
                render();
            }
        });
    }
    if (isConnectedMode()) {
        refreshConnected();
    }

    render();
    preloadSound("timer_sound_down.wav");
    preloadSound("timer_sound_up.wav");
    syncState(Date.now());
});
