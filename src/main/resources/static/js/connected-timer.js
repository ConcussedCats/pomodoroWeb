// Timer page in Connected Device Mode.
// When a cube is selected, this module renders the server timer state and turns the timer controls
// into commands for the cube. timer.js keeps the browser timer and stays out of the way
// while TelosConnectedTimer.isActive() is true. Switching rules: docs/esp32/PROTOCOL.md 1.4.
(function () {
    const REFRESH_WHILE_PENDING_MS = 2_000;
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
                leave({ notice: "The selected cube is no longer linked. Using the browser timer." });
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
                    leave({ notice: "This cube is no longer linked. Using the browser timer." });
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

        function handleCommandUpdate(command) {
            if (!pending || command.commandId !== pending.commandId) return;
            if (command.status === "EXECUTED") {
                pending = null;
                lastError = "";
                if (command.resultingVersion && (!state || state.version < command.resultingVersion)) {
                    loadState();
                }
            } else if (command.status === "REJECTED") {
                pending = null;
                lastError = `The cube rejected the command (${command.errorCode || "unknown reason"}).`;
            } else if (command.status === "EXPIRED") {
                pending = null;
                lastError = "The cube did not respond in time. Nothing was changed.";
            }
            render();
        }

        async function send(type, webMode) {
            if (!active || pending || !deviceId) return;
            const serverMode = webMode ? SERVER_MODES[webMode] : null;
            lastError = "";
            pending = { commandId: null, type };
            render();
            try {
                const command = await store.sendCommand(deviceId, type, serverMode);
                pending = { commandId: command.commandId, type };
                schedulePendingRefresh();
            } catch (error) {
                pending = null;
                lastError = error.code === "DEVICE_OFFLINE"
                    ? "The cube is offline. Turn it on and check its Wi-Fi."
                    : (error.message || "Could not send the command.");
                if (error.code === "DEVICE_OFFLINE") {
                    loadDevices();
                }
            }
            render();
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

        function enter(nextDeviceId) {
            if (!nextDeviceId) return;
            // Never run two independent timers: pause the browser timer first.
            document.dispatchEvent(new CustomEvent("timer:pause-local"));
            deviceId = nextDeviceId;
            const snapshot = store.loadSnapshot(deviceId);
            state = snapshot?.state || null;
            offsetMs = snapshot?.offsetMs || 0;
            pending = null;
            lastError = "";
            active = true;
            store.setActiveDeviceId(deviceId);
            timerSurface.classList.add("timer-surface--connected");
            if (live && !unsubscribeLive) {
                unsubscribeLive = live.subscribe(onLiveMessage);
            }
            startRenderLoop();
            render();
            loadState();
        }

        /** Asks the cube to stop before the browser timer can be used again; false keeps Connected Mode. */
        async function stopCubeBeforeLeaving() {
            if (state?.status !== "RUNNING" && state?.status !== "PAUSED") return true;
            const confirmed = window.confirm(
                "The cube timer is still active. Stop it on the cube and switch to the browser timer?"
            );
            if (!confirmed) return false;
            try {
                await store.sendCommand(deviceId, "STOP");
                return true;
            } catch (error) {
                return window.confirm(
                    "The cube could not be reached, so its timer may keep running. Switch to the browser timer anyway?"
                );
            }
        }

        function leave({ notice } = {}) {
            if (!active) return true;
            active = false;
            deviceId = null;
            state = null;
            pending = null;
            lastError = "";
            store.setActiveDeviceId(null);
            window.clearInterval(renderTimer);
            window.clearInterval(pendingRefreshTimer);
            timerSurface.classList.remove("timer-surface--connected");
            [startBtn, resetBtn, prevCycleBtn, nextCycleBtn, settingsToggle, ...modeLabels].forEach(el => setDisabled(el, false));
            document.dispatchEvent(new CustomEvent("timer:connected-mode-changed", { detail: { active: false } }));
            render();
            if (notice) {
                setSync(notice, "warning");
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
                    leave({ notice: "The selected cube was unbound. Using the browser timer." });
                }
                render();
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
            if (active) {
                sourceSelect.disabled = true;
                const canLeave = await stopCubeBeforeLeaving();
                sourceSelect.disabled = false;
                if (!canLeave) {
                    sourceSelect.value = String(deviceId);
                    return;
                }
                leave();
            }
            if (target) {
                enter(target);
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
        loadDevices();
    });
})();
