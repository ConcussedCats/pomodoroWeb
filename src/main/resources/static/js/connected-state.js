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

    function sendCommand(deviceId, type, mode) {
        return request(`/api/devices/${encodeURIComponent(deviceId)}/commands`, {
            method: "POST",
            headers: csrfHeaders(true),
            body: JSON.stringify({ type, mode: mode || null, clientRequestId: newRequestId() })
        });
    }

    // Logging out must not leave this account's cube selected for the next person on this browser.
    document.addEventListener("submit", (event) => {
        const action = event.target?.getAttribute?.("action") || "";
        if (action.endsWith("/logout")) {
            setActiveDeviceId(null);
        }
    }, true);

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
        sendCommand
    };
})();
