// Timer page in Connected Device Mode.
// When a cube is selected, this module renders the server timer state and turns the timer controls
// into commands for the cube. timer.js keeps the browser timer and stays out of the way
// while TelosConnectedTimer.isActive() is true. Switching rules: docs/esp32/PROTOCOL.md 1.4.
(function () {
    const REFRESH_WHILE_PENDING_MS = 2_000;
    // The cube polls every 3 s; give it a few polls to confirm a handover.
    const RELEASE_TIMEOUT_MS = 12_000;
    const SERVER_MODES = {
        pomodoro: "WORK",
        "short-break": "SHORT_BREAK",
        "long-break": "LONG_BREAK"
    };

    let active = false;

    window.TelosConnectedTimer = {
        isActive: () => active
    };

    document.addEventListener("DOMContentLoaded", () => {
        const store = window.TelosConnectedState;
        const live = window.TelosDeviceLive;
        const isAuthenticated = window.TelosAuth?.authenticated === true;

        const deviceBar = document.getElementById("deviceBar");
        const sourceSelect = document.getElementById("timerSource");
        const deviceStatusEl = document.getElementById("deviceStatus");
        const syncStatusEl = document.getElementById("deviceSync");
        const timerSurface = document.getElementById("timerSection");
        const timeDisplay = document.getElementById("timeDisplay");
        const timerLabel = document.querySelector(".timer-label");
        const progressBar = document.querySelector(".timer-progress-bar");
        const startBtn = document.getElementById("startBtn");
        const resetBtn = document.getElementById("resetBtn");
        const prevCycleBtn = document.getElementById("prevCycleBtn");
        const nextCycleBtn = document.getElementById("nextCycleBtn");
        const settingsToggle = document.getElementById("settingsToggle");
        const modeLabels = document.querySelectorAll(".mode-label");
        const sessionDotsEl = document.getElementById("sessionDots");
        const sessionCountEl = document.getElementById("sessionCount");
        const sessionTotalEl = document.getElementById("sessionTotal");
        const sessionProjectionTextEl = document.getElementById("sessionProjectionText");

        if (!store || !isAuthenticated || !deviceBar || !sourceSelect || !timerSurface || !startBtn) return;

        const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
        const finishSound = new Audio("assets/sounds/timer_sound_down.wav");

        let devices = [];
        let deviceId = null;
        let state = null;
        let offsetMs = 0;
        let pending = null;
        let lastError = "";
        let renderTimer = null;
        let pendingRefreshTimer = null;
        let unsubscribeLive = null;
        let liveStatus = live?.getStatus?.() || "closed";
        let notice = "";
        // True while the cube holds the phase (it was handed over or the cube was used), so leaving
        // Connected Mode copies the cube state into the browser timer.
        let cubeOwnsPhase = false;
        const lastCubeVersion = new Map();
        const timerStore = window.PomodoroTimerState;
        const recorder = () => window.TelosSessionRecorder;

        // ------------------------------------------------------------ helpers

        function currentDevice() {
            return devices.find(device => device.id === deviceId) || null;
        }

        function deviceOnline() {
            return currentDevice()?.status === "ONLINE";
        }

        function setSync(text, tone) {
            if (!syncStatusEl) return;
            syncStatusEl.textContent = text;
            syncStatusEl.dataset.tone = tone;
        }

        function formatTime(totalSeconds) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        }

        function soundEnabled() {
            try {
                return window.PomodoroTimerState?.loadSettings().soundEnabled !== false;
            } catch (error) {
                return true;
            }
        }

        /** Live messages must be newer; a REST snapshot (fromRest) may also confirm the same version. */
        function applyState(nextState, nextOffsetMs, fromRest = false) {
            if (!nextState || nextState.deviceId !== deviceId) return;
            if (state && state.deviceId === nextState.deviceId) {
                const older = Number(nextState.version) < Number(state.version);
                if (older || (!fromRest && !store.isNewer(nextState, state))) return;
            }

            const justFinished = state?.status === "RUNNING" && nextState.status === "FINISHED";
            state = nextState;
            lastCubeVersion.set(nextState.deviceId, Number(nextState.version));
            if (store.isCubeActive(nextState)) {
                cubeOwnsPhase = true;
            }
            if (Number.isFinite(nextOffsetMs)) {
                offsetMs = nextOffsetMs;
            }
            store.saveSnapshot(state, offsetMs);
            if (justFinished && soundEnabled()) {
                finishSound.currentTime = 0;
                finishSound.play().catch(() => {});
            }
            render();
        }

        // ------------------------------------------------------------ rendering

        function renderDeviceBar() {
            const showBar = devices.length > 0;
            deviceBar.classList.toggle("hidden", !showBar);

            sourceSelect.replaceChildren();
            const browserOption = document.createElement("option");
            browserOption.value = "";
            browserOption.textContent = "This browser";
            sourceSelect.appendChild(browserOption);
            devices.forEach((device) => {
                const option = document.createElement("option");
                option.value = String(device.id);
                option.textContent = `${device.name} (${device.status === "ONLINE" ? "online" : "offline"})`;
                sourceSelect.appendChild(option);
            });
            sourceSelect.value = deviceId ? String(deviceId) : "";

            if (deviceStatusEl) {
                const device = currentDevice();
                deviceStatusEl.classList.toggle("hidden", !device);
                deviceStatusEl.textContent = device ? device.status : "";
                deviceStatusEl.dataset.status = device ? device.status.toLowerCase() : "none";
            }
        }

        function renderSyncStatus() {
            if (!active) {
                setSync("", "idle");
                return;
            }
            if (lastError) {
                setSync(lastError, "error");
            } else if (notice) {
                setSync(notice, "warning");
            } else if (!deviceOnline()) {
                setSync("Cube offline. Showing the last known state.", "warning");
            } else if (pending) {
                setSync("Waiting for the cube to confirm…", "pending");
            } else if (liveStatus !== "open") {
                setSync("Reconnecting live updates…", "pending");
            } else if (!state) {
                setSync("Loading cube state…", "pending");
            } else {
                setSync("Synced with cube", "ok");
            }
        }

        function renderDots(filled, total) {
            if (!sessionDotsEl) return;
            const safeTotal = Math.max(1, total);
            while (sessionDotsEl.children.length < safeTotal) {
                const dot = document.createElement("span");
                dot.className = "session-dot";
                sessionDotsEl.appendChild(dot);
            }
            while (sessionDotsEl.children.length > safeTotal) {
                sessionDotsEl.lastElementChild.remove();
            }
            Array.from(sessionDotsEl.children).forEach((dot, index) => {
                dot.classList.toggle("session-dot--active", index < filled);
            });
        }

        function startButtonText(view) {
            if (pending) return "WAITING FOR CUBE";
            if (view.status === "RUNNING") return "PAUSE FLOW";
            if (view.status === "PAUSED") return "CONTINUE FLOW";
            if (view.status === "FINISHED") {
                return view.suggestedNextWebMode === "pomodoro" ? "START FOCUS" : "START BREAK";
            }
            return "START FLOW";
        }

        function setDisabled(button, disabled) {
            if (!button) return;
            button.disabled = disabled;
            button.setAttribute("aria-disabled", disabled ? "true" : "false");
        }

        function render() {
            renderDeviceBar();
            renderSyncStatus();
            if (!active) return;

            const view = store.toView(state, offsetMs);
            const controlsBlocked = Boolean(pending) || !deviceOnline() || !state;

            timeDisplay.textContent = formatTime(view.remainingSeconds);
            timerLabel.textContent = state ? view.label : "Cube timer";
            startBtn.querySelector(".btn-text").textContent = startButtonText(view);
            timerSurface.dataset.mode = view.webMode;

            modeLabels.forEach((label) => {
                const isActiveMode = label.dataset.mode === view.webMode;
                label.classList.toggle("mode-label--active", isActiveMode);
                label.setAttribute("aria-pressed", isActiveMode ? "true" : "false");
                setDisabled(label, controlsBlocked);
            });

            if (sessionCountEl) sessionCountEl.textContent = String(view.cycleNumber);
            if (sessionTotalEl) sessionTotalEl.textContent = String(view.totalCycles);
            if (sessionProjectionTextEl) {
                if (view.isRunning && state?.endsAt) {
                    sessionProjectionTextEl.textContent =
                        `Cube phase ends at ${timeFormatter.format(new Date(state.endsAt - offsetMs))}`;
                } else if (view.status === "FINISHED" && view.suggestedNextWebMode) {
                    sessionProjectionTextEl.textContent = view.suggestedNextWebMode === "pomodoro"
                        ? "Next: focus. Flip the cube or press start."
                        : "Next: break. Flip the cube or press start.";
                } else {
                    sessionProjectionTextEl.textContent = "Timer runs on your cube";
                }
            }
            renderDots(view.filledDots, view.totalDots);

            const circumference = 2 * Math.PI * 90;
            progressBar.style.strokeDasharray = `${circumference}`;
            progressBar.style.strokeDashoffset = `${circumference * (1 - view.progress)}`;

            setDisabled(startBtn, controlsBlocked);
            setDisabled(resetBtn, controlsBlocked || view.status === "STOPPED");
            setDisabled(prevCycleBtn, true);
            setDisabled(nextCycleBtn, true);
            setDisabled(settingsToggle, view.isRunning);
            timerSurface.classList.remove("timer-surface--hydrating");
        }

        // ------------------------------------------------------------ data loading

        async function loadDevices() {
            try {
                devices = await store.fetchDevices() || [];
            } catch (error) {
                // Keep the current selection on network errors; only a successful empty answer unbinds.
                if (active) {
                    lastError = "Could not load your devices.";
                }
                render();
                return;
            }
            if (deviceId && !currentDevice()) {
                // The selected cube was unbound (maybe in another tab or on another computer).
                leave({ message: "The selected cube is no longer linked. Using the browser timer." });
            }
            render();
        }

        async function loadState() {
            if (!deviceId) return;
            try {
                const result = await store.fetchState(deviceId);
                applyState(result.state, result.offsetMs, true);
                lastError = "";
            } catch (error) {
                if (error.status === 404 || error.status === 401) {
                    leave({ message: "This cube is no longer linked. Using the browser timer." });
                    return;
                }
                lastError = "Could not load the cube state.";
            }
            render();
        }

        async function refreshPending() {
            if (!pending || !deviceId) return;
            try {
                const response = await fetch(`/api/devices/${deviceId}/commands`, { credentials: "same-origin" });
                if (response.ok) {
                    const commands = await response.json();
                    const command = commands.find(item => item.commandId === pending.commandId);
                    if (command) {
                        handleCommandUpdate(command);
                    }
                }
            } catch (error) {
                // Next tick tries again.
            }
            if (pending && liveStatus !== "open") {
                await loadState();
            }
        }

        function schedulePendingRefresh() {
            window.clearInterval(pendingRefreshTimer);
            pendingRefreshTimer = window.setInterval(() => {
                if (!pending) {
                    window.clearInterval(pendingRefreshTimer);
                    pendingRefreshTimer = null;
                    return;
                }
                refreshPending();
            }, REFRESH_WHILE_PENDING_MS);
        }

        // ------------------------------------------------------------ commands

        /** Ends the pending command and wakes up a caller that waits for it (handover). */
        function settlePending(outcome) {
            const waiting = pending?.resolve;
            pending = null;
            waiting?.(outcome);
        }

        function handleCommandUpdate(command) {
            if (!pending || command.commandId !== pending.commandId) return;
            if (command.status === "EXECUTED") {
                lastError = "";
                pending.onExecuted?.();
                settlePending("EXECUTED");
                if (command.resultingVersion && (!state || state.version < command.resultingVersion)) {
                    loadState();
                }
            } else if (command.status === "REJECTED") {
                lastError = `The cube rejected the command (${command.errorCode || "unknown reason"}).`;
                settlePending("REJECTED");
            } else if (command.status === "EXPIRED") {
                lastError = "The cube did not respond in time. Nothing was changed.";
                settlePending("EXPIRED");
            }
            render();
        }

        /**
         * Sends a command to the cube. The returned promise resolves with EXECUTED, REJECTED, EXPIRED,
         * TIMEOUT, FAILED or BUSY once there is an answer; the UI shows success only after EXECUTED.
         */
        function send(type, mode, { targetState, onExecuted, timeoutMs } = {}) {
            if (!active || pending || !deviceId) return Promise.resolve("BUSY");
            const serverMode = mode ? (SERVER_MODES[mode] || mode) : null;
            lastError = "";
            notice = "";

            return new Promise((resolve) => {
                pending = { commandId: null, type, resolve, onExecuted };
                render();
                store.sendCommand(deviceId, type, serverMode, targetState)
                    .then((command) => {
                        if (!pending) return;
                        pending.commandId = command.commandId;
                        schedulePendingRefresh();
                        if (timeoutMs) {
                            window.setTimeout(() => {
                                if (pending?.commandId === command.commandId) {
                                    settlePending("TIMEOUT");
                                    render();
                                }
                            }, timeoutMs);
                        }
                    })
                    .catch((error) => {
                        lastError = error.code === "DEVICE_OFFLINE"
                            ? "The cube is offline. Turn it on and check its Wi-Fi."
                            : (error.message || "Could not send the command.");
                        if (error.code === "DEVICE_OFFLINE") {
                            loadDevices();
                        }
                        settlePending("FAILED");
                        render();
                    });
            });
        }

        function onStartClick() {
            if (!active || !state) return;
            if (state.status === "RUNNING") {
                send("PAUSE");
            } else if (state.status === "PAUSED") {
                send("RESUME");
            } else if (state.status === "FINISHED") {
                send("START", store.webModeOf(state.suggestedNextMode || "WORK"));
            } else {
                send("START", state.webMode || "pomodoro");
            }
        }

        function onResetClick() {
            if (!active || !state || state.status === "STOPPED") return;
            send("STOP");
        }

        function onModeClick(event) {
            if (!active || !state) return;
            const targetMode = event.currentTarget.dataset.mode;
            if (!targetMode) return;
            const runningSameMode = targetMode === state.webMode && (state.status === "RUNNING" || state.status === "PAUSED");
            if (runningSameMode) return;
            send(state.status === "RUNNING" || state.status === "PAUSED" ? "SWITCH_MODE" : "START", targetMode);
        }

        // ------------------------------------------------------------ switching modes

        function startRenderLoop() {
            window.clearInterval(renderTimer);
            renderTimer = window.setInterval(() => {
                if (active && state?.status === "RUNNING") {
                    render();
                }
            }, 1000);
        }

        function readBrowserTimer() {
            const settings = timerStore.loadSettings();
            return { settings, state: timerStore.loadTimerState(settings) };
        }

        /** Browser -> cube: the cube continues the browser phase to the same end moment. */
        async function handOverToCube(browser) {
            if (!store.browserHasProgress(browser.state, browser.settings, timerStore)) return;
            if (store.isCubeActive(state)) {
                const keepBrowser = window.confirm(
                    "The browser timer and the cube both have a phase in progress.\n\n"
                    + "OK: continue the browser phase on the cube.\nCancel: keep the cube's phase."
                );
                if (!keepBrowser) {
                    recorder()?.closeCurrent();
                    return;
                }
            }
            if (!deviceOnline()) {
                notice = "The cube is offline, so the browser phase stays in the browser.";
                render();
                return;
            }

            const session = recorder()?.handOver(browser.state) || null;
            const command = store.browserToCubeCommand(browser.state, browser.settings, timerStore, { offsetMs, session });
            if (!command) return;
            const outcome = await send(command.type, command.mode, {
                targetState: command.targetState,
                onExecuted: () => {
                    cubeOwnsPhase = true;
                    if (session) {
                        recorder()?.forget(session.id);
                    }
                }
            });
            if (outcome === "EXECUTED") {
                notice = "The browser phase continues on the cube.";
            } else if (!lastError) {
                lastError = "The cube did not take over the browser phase.";
            }
            render();
        }

        /** Cube -> browser before leaving Connected Mode; false keeps Connected Mode. */
        async function handOverToBrowser() {
            const cube = state;
            const cubeOffset = offsetMs;
            if (!cube) return true;
            const settings = timerStore.loadSettings();

            if (store.isCubeActive(cube)) {
                let released = false;
                if (deviceOnline()) {
                    notice = "Handing the phase over to this browser…";
                    released = (await send("RELEASE", null, { timeoutMs: RELEASE_TIMEOUT_MS })) === "EXECUTED";
                }
                if (!released && !window.confirm(
                    "The cube did not confirm, so it may keep running.\nContinue its phase in this browser anyway?"
                )) {
                    notice = "";
                    render();
                    return false;
                }
                const browserState = store.cubeToBrowserState(cube, settings, timerStore, { offsetMs: cubeOffset });
                timerStore.saveTimerState(browserState, settings);
                recorder()?.adopt({ sessionId: cube.sessionId, state: browserState, settings, store: timerStore });
            } else if (cubeOwnsPhase) {
                const browserState = store.cubeToBrowserState(cube, settings, timerStore, { offsetMs: cubeOffset });
                timerStore.saveTimerState(browserState, settings);
            }
            return true;
        }

        function enter(nextDeviceId, { handover = false, message = "" } = {}) {
            if (!nextDeviceId) return;
            // Read the browser phase before it is paused, it may be handed over to the cube.
            const browser = handover ? readBrowserTimer() : null;
            // Never run two independent timers: pause the browser timer first.
            document.dispatchEvent(new CustomEvent("timer:pause-local"));
            deviceId = nextDeviceId;
            const snapshot = store.loadSnapshot(deviceId);
            state = snapshot?.state || null;
            offsetMs = snapshot?.offsetMs || 0;
            pending = null;
            lastError = "";
            notice = message;
            cubeOwnsPhase = store.isCubeActive(state);
            active = true;
            store.setActiveDeviceId(deviceId);
            timerSurface.classList.add("timer-surface--connected");
            startRenderLoop();
            render();
            loadState().then(() => {
                if (browser && active && deviceId === nextDeviceId) {
                    handOverToCube(browser);
                }
            });
        }

        /** Somebody flipped the cube while the browser timer was shown: the cube wins. */
        function takeOver(cubeId) {
            recorder()?.closeCurrent();
            enter(cubeId, { message: "The cube was started, so the timer now runs on the cube." });
        }

        async function takeOverIfCubeIsRunning() {
            for (const device of devices.filter(item => item.status === "ONLINE")) {
                try {
                    const result = await store.fetchState(device.id);
                    lastCubeVersion.set(device.id, Number(result.state.version));
                    if (!active && result.state.status === "RUNNING") {
                        store.saveSnapshot(result.state, result.offsetMs);
                        takeOver(device.id);
                        return;
                    }
                } catch (error) {
                    // Not reachable right now; the live channel reports later changes.
                }
            }
        }

        function leave({ message } = {}) {
            if (!active) return true;
            if (deviceId && state) {
                lastCubeVersion.set(deviceId, Number(state.version));
            }
            active = false;
            deviceId = null;
            state = null;
            settlePending("CANCELLED");
            lastError = "";
            notice = "";
            cubeOwnsPhase = false;
            store.setActiveDeviceId(null);
            window.clearInterval(renderTimer);
            window.clearInterval(pendingRefreshTimer);
            timerSurface.classList.remove("timer-surface--connected");
            [startBtn, resetBtn, prevCycleBtn, nextCycleBtn, settingsToggle, ...modeLabels].forEach(el => setDisabled(el, false));
            document.dispatchEvent(new CustomEvent("timer:connected-mode-changed", { detail: { active: false } }));
            render();
            if (message) {
                setSync(message, "warning");
            }
            return true;
        }

        function onLiveMessage(message) {
            if (message.type === "RESYNC") {
                loadDevices();
                loadState();
                return;
            }
            if (message.type === "DEVICE_ADDED" || message.type === "DEVICE_UPDATED") {
                if (message.device) {
                    const index = devices.findIndex(device => device.id === message.device.id);
                    if (index >= 0) {
                        devices[index] = message.device;
                    } else {
                        devices.push(message.device);
                    }
                    render();
                } else {
                    loadDevices();
                }
                return;
            }
            if (message.type === "DEVICE_STATUS") {
                const device = devices.find(item => item.id === message.deviceId);
                if (device) {
                    device.status = message.status;
                    device.lastSeenAt = message.lastSeenAt;
                    render();
                }
                return;
            }
            if (message.type === "DEVICE_REMOVED") {
                devices = devices.filter(device => device.id !== message.deviceId);
                if (message.deviceId === deviceId) {
                    leave({ message: "The selected cube was unbound. Using the browser timer." });
                }
                render();
                return;
            }
            if (message.type === "TIMER_STATE" && !active) {
                const known = lastCubeVersion.get(message.deviceId) ?? -1;
                lastCubeVersion.set(message.deviceId, Number(message.state.version));
                const isOwnCube = devices.some(device => device.id === message.deviceId);
                if (isOwnCube && message.state.status === "RUNNING" && Number(message.state.version) > known) {
                    store.saveSnapshot(message.state, store.computeClockOffset(message.state));
                    takeOver(message.deviceId);
                }
                return;
            }
            if (message.deviceId !== deviceId) return;
            if (message.type === "TIMER_STATE") {
                applyState(message.state, store.computeClockOffset(message.state));
            } else if (message.type === "COMMAND" && message.command) {
                handleCommandUpdate(message.command);
            }
        }

        // ------------------------------------------------------------ wiring

        sourceSelect.addEventListener("change", async () => {
            const selected = Number.parseInt(sourceSelect.value, 10);
            const target = Number.isFinite(selected) ? selected : null;
            if (target === deviceId) return;
            if (pending) {
                sourceSelect.value = deviceId ? String(deviceId) : "";
                lastError = "Wait until the cube confirms the last command.";
                render();
                return;
            }
            if (active) {
                sourceSelect.disabled = true;
                const canLeave = await handOverToBrowser();
                sourceSelect.disabled = false;
                if (!canLeave) {
                    sourceSelect.value = String(deviceId);
                    return;
                }
                leave();
            }
            if (target) {
                enter(target, { handover: true });
            }
        });

        startBtn.addEventListener("click", onStartClick);
        resetBtn?.addEventListener("click", onResetClick);
        modeLabels.forEach(label => label.addEventListener("click", onModeClick));

        window.addEventListener("storage", (event) => {
            if (event.key !== store.keys.ACTIVE_DEVICE_KEY) return;
            const nextId = store.getActiveDeviceId();
            if (nextId === deviceId) return;
            if (nextId) {
                enter(nextId);
            } else {
                leave();
            }
        });

        live?.onConnection((status) => {
            liveStatus = status;
            renderSyncStatus();
        });

        if (live) {
            unsubscribeLive = live.subscribe(onLiveMessage);
        }

        // Enter right away from the last snapshot (no flash of the browser timer);
        // loadDevices() switches back to Standalone Mode if the cube is gone.
        const storedId = store.getActiveDeviceId();
        if (storedId) {
            enter(storedId);
        }
        loadDevices().then(() => {
            if (!active) {
                takeOverIfCubeIsRunning();
            }
        });
    });
})();
