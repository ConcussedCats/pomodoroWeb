// Connected Device Mode: shared state for the timer page and the mini timer.
// In this mode the cube is the only thing counting down; the browser shows the server state
// (docs/esp32/PROTOCOL.md 1.4) and never changes it by itself.
(function () {
    const ACTIVE_DEVICE_KEY = "telosActiveDeviceId";
    const SNAPSHOT_KEY = "telosConnectedSnapshot";

    const labelText = {
        pomodoro: "Focus Time",
        "short-break": "Short Break",
        "long-break": "Long Break"
    };

    function readStorage(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            if (value === null) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, value);
            }
        } catch (error) {
            // Private mode or blocked storage: Connected Mode still works in this tab.
        }
    }

    function getActiveDeviceId() {
        const raw = readStorage(ACTIVE_DEVICE_KEY);
        const id = Number.parseInt(raw, 10);
        return Number.isFinite(id) && id > 0 ? id : null;
    }

    function setActiveDeviceId(deviceId) {
        const id = Number.parseInt(deviceId, 10);
        const safeId = Number.isFinite(id) && id > 0 ? id : null;
        writeStorage(ACTIVE_DEVICE_KEY, safeId === null ? null : String(safeId));
        if (safeId === null) {
            writeStorage(SNAPSHOT_KEY, null);
        }
        return safeId;
    }

    /** offsetMs = serverTime - local time, so countdowns use the server clock. */
    function computeClockOffset(state, receivedAt = Date.now()) {
        const serverTime = Number(state?.serverTime);
        return Number.isFinite(serverTime) ? serverTime - receivedAt : 0;
    }

    function saveSnapshot(state, offsetMs) {
        if (!state) return;
        writeStorage(SNAPSHOT_KEY, JSON.stringify({ state, offsetMs: Number(offsetMs) || 0 }));
    }

    function loadSnapshot(deviceId) {
        const raw = readStorage(SNAPSHOT_KEY);
        if (!raw) return null;
        try {
            const snapshot = JSON.parse(raw);
            if (!snapshot?.state || (deviceId && snapshot.state.deviceId !== deviceId)) {
                return null;
            }
            return snapshot;
        } catch (error) {
            return null;
        }
    }

    /** Only accept a newer version, protecting against out-of-order WebSocket / REST responses. */
    function isNewer(candidate, current) {
        if (!candidate) return false;
        if (!current) return true;
        if (candidate.deviceId !== current.deviceId) return true;
        return Number(candidate.version) > Number(current.version);
    }

    function getRemainingSeconds(state, offsetMs = 0, now = Date.now()) {
        if (!state) return 0;
        if (state.status === "FINISHED") return 0;
        if (state.status !== "RUNNING" || !state.endsAt) {
            return Math.max(0, Number(state.remainingSeconds) || 0);
        }
        const serverNow = now + (Number(offsetMs) || 0);
        return Math.max(0, Math.ceil((state.endsAt - serverNow) / 1000));
    }

    function webModeOf(serverMode) {
        if (serverMode === "SHORT_BREAK") return "short-break";
        if (serverMode === "LONG_BREAK") return "long-break";
        return "pomodoro";
    }

    function statusText(state) {
        if (!state) return "Waiting";
        if (state.status === "RUNNING") return "Running";
        if (state.status === "PAUSED") return "Paused";
        if (state.status === "FINISHED") return state.sessionCompleted ? "Completed" : "Finished";
        return "Ready";
    }

    function toView(state, offsetMs = 0, now = Date.now()) {
        const webMode = state?.webMode || webModeOf(state?.mode);
        const remainingSeconds = getRemainingSeconds(state, offsetMs, now);
        const durationSeconds = Math.max(1, Number(state?.durationSeconds) || 1);
        const suggested = state?.suggestedNextMode ? webModeOf(state.suggestedNextMode) : null;

        let label = labelText[webMode] || "Timer";
        if (state?.status === "FINISHED") {
            if (state.sessionCompleted) {
                label = "Session Complete";
            } else {
                label = webMode === "pomodoro" ? "Focus done" : "Break done";
            }
        }

        return {
            webMode,
            label,
            remainingSeconds,
            durationSeconds,
            progress: Math.min(Math.max(1 - (remainingSeconds / durationSeconds), 0), 1),
            isRunning: state?.status === "RUNNING",
            status: state?.status || "STOPPED",
            statusText: statusText(state),
            suggestedNextWebMode: suggested,
            cycleNumber: Math.min((Number(state?.cycleIndex) || 0) + 1, Number(state?.totalCycles) || 1),
            totalCycles: Number(state?.totalCycles) || 1,
            filledDots: Number(state?.filledDots) || 1,
            totalDots: Number(state?.workPhasesPerCycle) || 4
        };
    }

    function csrfHeaders(json) {
        const token = document.querySelector('meta[name="_csrf"]')?.content;
        const header = document.querySelector('meta[name="_csrf_header"]')?.content;
        return {
            ...(json ? { "Content-Type": "application/json" } : {}),
            ...(token && header ? { [header]: token } : {})
        };
    }

    async function readJson(response) {
        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (error) {
            return null;
        }
    }

    async function request(url, options = {}) {
        const response = await fetch(url, { credentials: "same-origin", ...options });
        const body = await readJson(response);
        if (!response.ok) {
            const error = new Error(body?.message || `Request failed (${response.status})`);
            error.status = response.status;
            error.code = body?.errorCode || null;
            throw error;
        }
        return body;
    }

    function fetchDevices() {
        return request("/api/devices");
    }

    async function fetchState(deviceId) {
        const receivedAt = Date.now();
        const state = await request(`/api/devices/${encodeURIComponent(deviceId)}/state`);
        return { state, offsetMs: computeClockOffset(state, receivedAt) };
    }

    function newRequestId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function sendCommand(deviceId, type, mode, targetState) {
        const body = { type, mode: mode || null, clientRequestId: newRequestId() };
        if (targetState) {
            body.targetState = targetState;
        }
        return request(`/api/devices/${encodeURIComponent(deviceId)}/commands`, {
            method: "POST",
            headers: csrfHeaders(true),
            body: JSON.stringify(body)
        });
    }

    // ------------------------------------------------------------ handover browser <-> cube (PROTOCOL.md 1.4, 1.6)

    const SERVER_MODES = {
        pomodoro: "WORK",
        "short-break": "SHORT_BREAK",
        "long-break": "LONG_BREAK"
    };

    function isCubeActive(state) {
        return state?.status === "RUNNING" || state?.status === "PAUSED";
    }

    /** True when the browser timer is somewhere else than its untouched starting point. */
    function browserHasProgress(browserState, settings, timerStore) {
        if (!browserState || browserState.sessionCompleted) return false;
        return !timerStore.areStatesEqual(browserState, timerStore.getDefaultTimerState(settings));
    }

    /**
     * SET_STATE command for the current browser phase, or null when there is nothing to hand over.
     * endsAt is converted to the server clock, so the cube ends the phase at the same moment.
     */
    function browserToCubeCommand(browserState, settings, timerStore, { offsetMs = 0, now = Date.now(), session } = {}) {
        const remainingSeconds = timerStore.getRemainingSeconds(browserState, now);
        if (remainingSeconds <= 0) return null;
        const running = browserState.isRunning && Number.isFinite(browserState.endTime);

        return {
            type: "SET_STATE",
            mode: SERVER_MODES[browserState.currentMode] || "WORK",
            targetState: {
                status: running ? "RUNNING" : "PAUSED",
                durationSeconds: timerStore.getModeDurationSeconds(settings, browserState.currentMode),
                remainingSeconds,
                endsAt: running ? browserState.endTime + offsetMs : null,
                sessionId: session?.id || null,
                sessionStartedAt: session?.startedAt ?? null,
                cycleIndex: browserState.currentCycleIndex,
                phaseIndex: browserState.currentPhaseIndex
            }
        };
    }

    /**
     * Browser timer state that continues the cube phase: same mode, end moment (local clock), cycle position.
     * An idle cube hands over only its position (after FINISHED that is the next phase, ready to start).
     */
    function cubeToBrowserState(cubeState, settings, timerStore, { offsetMs = 0, now = Date.now() } = {}) {
        const phases = timerStore.getPatternPhases(settings);
        if (cubeState.sessionCompleted) {
            return timerStore.hydrateTimerState({
                currentCycleIndex: settings.focusCycles - 1,
                currentPhaseIndex: phases.length - 1,
                currentMode: phases[phases.length - 1].mode,
                isRunning: false,
                remainingSeconds: 0,
                sessionCompleted: true
            }, settings, now);
        }

        const cycleIndex = Math.max(0, Number(cubeState.cycleIndex) || 0);
        const phaseIndex = Math.min(Math.max(0, Number(cubeState.phaseIndex) || 0), phases.length - 1);
        const active = isCubeActive(cubeState);
        const mode = active ? webModeOf(cubeState.mode) : phases[phaseIndex].mode;
        const running = cubeState.status === "RUNNING" && Number.isFinite(cubeState.endsAt);
        const endTime = running ? cubeState.endsAt - offsetMs : null;

        let remainingSeconds = timerStore.getModeDurationSeconds(settings, mode);
        if (running) {
            remainingSeconds = Math.max(0, Math.ceil((endTime - now) / 1000));
        } else if (cubeState.status === "PAUSED") {
            remainingSeconds = Math.max(0, Number(cubeState.remainingSeconds) || 0);
        }

        // hydrateTimerState is the public normalizer of timer-state.js.
        return timerStore.hydrateTimerState({
            currentCycleIndex: cycleIndex,
            currentPhaseIndex: phaseIndex,
            currentMode: mode,
            isRunning: running,
            endTime,
            remainingSeconds,
            manualModeMemoryClearAt: null,
            sessionCompleted: false
        }, settings, now);
    }

    // Logging out must not leave this account's cube selected for the next person on this browser.
    document.addEventListener("submit", (event) => {
        const action = event.target?.getAttribute?.("action") || "";
        if (action.endsWith("/logout")) {
            setActiveDeviceId(null);
        }
    }, true);

    /**
     * The selected cube is gone (offline): the browser timer continues its last known phase and the
     * browser becomes the timer source again. Returns the browser state that was saved.
     */
    function continueInBrowser(cubeState, offsetMs, timerStore) {
        const settings = timerStore.loadSettings();
        let browserState = null;
        if (cubeState) {
            browserState = cubeToBrowserState(cubeState, settings, timerStore, { offsetMs });
            timerStore.saveTimerState(browserState, settings);
        }
        setActiveDeviceId(null);
        document.dispatchEvent(new CustomEvent("connected:source-changed", { detail: { deviceId: null } }));
        return { settings, browserState };
    }

    window.TelosConnectedState = {
        keys: { ACTIVE_DEVICE_KEY, SNAPSHOT_KEY },
        getActiveDeviceId,
        setActiveDeviceId,
        computeClockOffset,
        saveSnapshot,
        loadSnapshot,
        isNewer,
        getRemainingSeconds,
        webModeOf,
        statusText,
        toView,
        fetchDevices,
        fetchState,
        sendCommand,
        continueInBrowser,
        isCubeActive,
        browserHasProgress,
        browserToCubeCommand,
        cubeToBrowserState
    };
})();
