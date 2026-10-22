// Records finished and interrupted phases of the browser timer (Standalone Mode) in the server history.
// It only listens to "timer:state-updated" from timer.js and never changes the timer itself.
// The tracker lives in localStorage so all tabs share one id per phase; the server ignores repeats.
(function () {
    const TRACKER_KEY = "telosSessionTracker";
    const OUTBOX_KEY = "telosSessionOutbox";
    const MIN_RECORDED_SECONDS = 60;
    const MAX_OUTBOX = 50;

    const modeToType = {
        pomodoro: "WORK",
        "short-break": "SHORT_BREAK",
        "long-break": "LONG_BREAK"
    };

    function read(key, fallback) {
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            if (value === null) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (error) {
            // Storage unavailable: history for this phase is skipped, the timer is unaffected.
        }
    }

    function newId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }
        // RFC 4122 v4 fallback for older browsers.
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
            const random = Math.floor(Math.random() * 16);
            return (char === "x" ? random : ((random & 0x3) | 0x8)).toString(16);
        });
    }

    function phaseKey(state) {
        return `${state.currentCycleIndex}:${state.currentPhaseIndex}:${state.currentMode}`;
    }

    function plannedSeconds(store, settings, mode) {
        return store.getModeDurationSeconds(settings, mode);
    }

    /** Seconds still left for the tracked phase at the moment it ended. */
    function remainingAtEnd(tracker, now) {
        if (tracker.endTime) {
            return Math.max(0, Math.ceil((tracker.endTime - now) / 1000));
        }
        return Math.max(0, tracker.remainingSeconds);
    }

    function buildRecord(tracker, now) {
        const remaining = remainingAtEnd(tracker, now);
        const completed = remaining <= 1;
        const finishedAt = completed && tracker.endTime ? Math.min(tracker.endTime, now) : now;
        const actual = completed ? tracker.plannedSeconds : Math.max(0, tracker.plannedSeconds - remaining);

        // Clicking through modes is not a session; a phase continued from the cube must always be closed.
        if (!completed && actual < MIN_RECORDED_SECONDS && !tracker.adopted) {
            return null;
        }

        return {
            externalId: tracker.id,
            type: modeToType[tracker.mode] || "WORK",
            status: completed ? "COMPLETED" : "INTERRUPTED",
            plannedDurationSeconds: tracker.plannedSeconds,
            actualDurationSeconds: Math.min(actual, tracker.plannedSeconds),
            startedAt: tracker.startedAt,
            finishedAt: Math.max(finishedAt, tracker.startedAt)
        };
    }

    /**
     * Pure transition used by the page and by the unit tests.
     * Returns { tracker, record } where record (or null) is the session that just ended.
     */
    function observe(tracker, state, settings, store, now) {
        let record = null;
        let nextTracker = tracker;
        const key = phaseKey(state);
        const isDefault = store.areStatesEqual(state, store.getDefaultTimerState(settings));

        if (nextTracker && (nextTracker.key !== key || state.sessionCompleted || (isDefault && !state.isRunning))) {
            record = buildRecord(nextTracker, now);
            nextTracker = null;
        }

        if (!nextTracker && state.isRunning && !state.sessionCompleted) {
            const planned = plannedSeconds(store, settings, state.currentMode);
            const remaining = store.getRemainingSeconds(state, now);
            nextTracker = {
                id: newId(),
                key,
                mode: state.currentMode,
                plannedSeconds: planned,
                startedAt: now - Math.max(0, planned - remaining) * 1000,
                endTime: state.endTime,
                remainingSeconds: remaining
            };
        } else if (nextTracker) {
            nextTracker = {
                ...nextTracker,
                endTime: state.isRunning ? state.endTime : null,
                remainingSeconds: store.getRemainingSeconds(state, now)
            };
        }

        return { tracker: nextTracker, record };
    }

    function csrfHeaders() {
        const token = document.querySelector('meta[name="_csrf"]')?.content;
        const header = document.querySelector('meta[name="_csrf_header"]')?.content;
        return {
            "Content-Type": "application/json",
            ...(token && header ? { [header]: token } : {})
        };
    }

    async function post(record) {
        const response = await fetch("/api/pomodoro-sessions", {
            method: "POST",
            credentials: "same-origin",
            headers: csrfHeaders(),
            body: JSON.stringify(record)
        });
        // 409: another tab recorded it at the same moment; 4xx: invalid record, retrying will not help.
        return response.ok || (response.status >= 400 && response.status < 500);
    }

    async function flushOutbox() {
        const outbox = read(OUTBOX_KEY, []);
        if (!outbox.length) return;
        const remaining = [];
        for (const record of outbox) {
            try {
                if (!(await post(record))) {
                    remaining.push(record);
                }
            } catch (error) {
                remaining.push(record);
            }
        }
        write(OUTBOX_KEY, remaining.length ? remaining : null);
    }

    function enqueue(record) {
        const outbox = read(OUTBOX_KEY, []);
        if (outbox.some(item => item.externalId === record.externalId)) return;
        outbox.push(record);
        write(OUTBOX_KEY, outbox.slice(-MAX_OUTBOX));
    }

    /** Session id and start of the current browser phase, to continue it on the cube (SET_STATE). */
    function handOver(state) {
        const tracker = read(TRACKER_KEY, null);
        if (!tracker || !state || tracker.key !== phaseKey(state)) return null;
        return { id: tracker.id, startedAt: tracker.startedAt };
    }

    /** The cube took the phase over: the browser must not record it as well. */
    function forget(sessionId) {
        const tracker = read(TRACKER_KEY, null);
        if (tracker && tracker.id === sessionId) {
            write(TRACKER_KEY, null);
        }
    }

    /** The browser continues a cube phase: keep its session id so history stays one session. */
    function adopt({ sessionId, state, settings, store, now = Date.now() }) {
        closeCurrent(now);
        if (!sessionId || !state || state.sessionCompleted) return;
        const planned = store.getModeDurationSeconds(settings, state.currentMode);
        const remaining = store.getRemainingSeconds(state, now);
        write(TRACKER_KEY, {
            id: sessionId,
            key: phaseKey(state),
            mode: state.currentMode,
            plannedSeconds: planned,
            startedAt: now - Math.max(0, planned - remaining) * 1000,
            endTime: state.isRunning ? state.endTime : null,
            remainingSeconds: remaining,
            adopted: true
        });
    }

    /** Records the current browser phase as ended now (e.g. a cube flip took over). */
    function closeCurrent(now = Date.now()) {
        const tracker = read(TRACKER_KEY, null);
        if (!tracker) return;
        write(TRACKER_KEY, null);
        const record = buildRecord(tracker, now);
        if (record) {
            enqueue(record);
            flushOutbox();
        }
    }

    window.TelosSessionRecorder = { observe, buildRecord, handOver, forget, adopt, closeCurrent };

    document.addEventListener("DOMContentLoaded", () => {
        const store = window.PomodoroTimerState;
        if (!store || window.TelosAuth?.authenticated !== true) return;

        document.addEventListener("timer:state-updated", (event) => {
            if (window.TelosConnectedTimer?.isActive()) return; // the cube records its own sessions
            const { state, settings } = event.detail || {};
            if (!state || !settings) return;

            const result = observe(read(TRACKER_KEY, null), state, settings, store, Date.now());
            write(TRACKER_KEY, result.tracker);
            if (result.record) {
                enqueue(result.record);
                flushOutbox();
            }
        });

        flushOutbox();
    });
})();
