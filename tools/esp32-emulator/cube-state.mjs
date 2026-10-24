// Local timer of the emulated cube: face rules, commands and the outbound event queue.
// Mirrors what the ESP32 firmware must do (docs/esp32/PROTOCOL.md sections 1, 3.5 and 5).
import { randomUUID } from "node:crypto";

export const MODES = ["WORK", "SHORT_BREAK", "LONG_BREAK"];
export const FACES = [...MODES, "PAUSE", "DISPLAY", "TECH"];

const EVENTS = {
    finish: "TIMER_FINISHED",
    pause: "TIMER_PAUSED",
    resume: "TIMER_RESUMED",
    start: "TIMER_STARTED",
    stop: "TIMER_STOPPED"
};

const EXECUTED = Object.freeze({ result: "EXECUTED", errorCode: null });

function rejected(errorCode) {
    return { result: "REJECTED", errorCode };
}

function positive(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

function isValidTarget(mode, target) {
    if (!MODES.includes(mode) || !target) return false;
    if (!["RUNNING", "PAUSED"].includes(target.status)) return false;
    if (!Number.isFinite(target.durationSeconds) || target.durationSeconds <= 0) return false;
    if (!Number.isFinite(target.remainingSeconds)) return false;
    return target.remainingSeconds >= 0 && target.remainingSeconds <= target.durationSeconds;
}

export class CubeState {
    constructor({ now = () => Date.now(), clockSynced = true, bootId = randomUUID(), durations = {} } = {}) {
        this.now = now;
        this.clockSynced = clockSynced;
        // serverTime - local time, learned from server responses (PROTOCOL.md 1.6).
        this.clockOffset = null;
        this.bootId = bootId;
        this.seq = 0;
        this.queue = [];
        this.face = "DISPLAY";
        this.configure({ timer: durations });
        this.state = this.freshState("WORK", "STOPPED");
    }

    configure(config = {}) {
        const timer = config.timer || config;
        this.durations = {
            WORK: positive(timer.pomodoroMinutes, 25) * 60,
            SHORT_BREAK: positive(timer.shortBreakMinutes, 5) * 60,
            LONG_BREAK: positive(timer.longBreakMinutes, 15) * 60
        };
    }

    setClockOffset(offset) {
        this.clockOffset = Number.isFinite(offset) ? offset : null;
    }

    freshState(mode, status = "RUNNING") {
        const durationSeconds = this.durations[mode];
        return {
            mode,
            status,
            durationSeconds,
            remainingSeconds: durationSeconds,
            startedAt: null,
            pausedAt: null,
            sessionId: null,
            cycleIndex: 0,
            phaseIndex: 0,
            localEndsAt: null
        };
    }

    getRemainingSeconds() {
        if (this.state.status !== "RUNNING") {
            return this.state.remainingSeconds;
        }
        const localEndsAt = this.state.localEndsAt ?? this.state.startedAt + this.state.remainingSeconds * 1000;
        return Math.max(0, Math.ceil((localEndsAt - this.now()) / 1000));
    }

    /** State as reported to the server; endsAt is on the server clock when the offset is known. */
    snapshot() {
        const snapshot = { ...this.state };
        delete snapshot.localEndsAt;
        const running = this.state.status === "RUNNING" && Number.isFinite(this.state.localEndsAt);
        snapshot.endsAt = running && Number.isFinite(this.clockOffset)
            ? this.state.localEndsAt + this.clockOffset
            : null;
        return snapshot;
    }

    getEvents() {
        return this.queue.map(event => ({ ...event, state: { ...event.state } }));
    }

    removeEvents(ids) {
        const removed = new Set(ids);
        this.queue = this.queue.filter(event => !removed.has(event.eventId));
    }

    emit(type, face) {
        const synced = typeof this.clockSynced === "function" ? this.clockSynced() : this.clockSynced;
        const event = {
            eventId: randomUUID(),
            seq: ++this.seq,
            type,
            occurredAt: synced ? this.now() : null,
            state: this.snapshot()
        };
        if (face) {
            event.face = face;
        }
        this.queue.push(event);
    }

    start(mode) {
        this.state = this.freshState(mode);
        this.state.startedAt = this.now();
        this.state.localEndsAt = this.now() + this.state.remainingSeconds * 1000;
        this.state.sessionId = randomUUID();
        this.emit(EVENTS.start);
    }

    pause() {
        this.state.remainingSeconds = this.getRemainingSeconds();
        this.state.status = "PAUSED";
        this.state.pausedAt = this.now();
        this.state.startedAt = null;
        this.state.localEndsAt = null;
        this.emit(EVENTS.pause);
    }

    resume() {
        this.state.status = "RUNNING";
        this.state.startedAt = this.now();
        this.state.localEndsAt = this.now() + this.state.remainingSeconds * 1000;
        this.state.pausedAt = null;
        this.emit(EVENTS.resume);
    }

    stop() {
        this.state = this.freshState(this.state.mode, "STOPPED");
        this.emit(EVENTS.stop);
    }

    tick() {
        if (this.state.status !== "RUNNING" || this.getRemainingSeconds() !== 0) {
            return false;
        }
        this.state.remainingSeconds = 0;
        this.state.status = "FINISHED";
        this.state.startedAt = null;
        this.state.pausedAt = null;
        this.state.localEndsAt = null;
        this.emit(EVENTS.finish);
        return true;
    }

    applyFace(face) {
        if (!FACES.includes(face)) {
            return { changed: false, errorCode: "INVALID_FACE" };
        }
        const changed = this.face !== face;
        this.face = face;
        if (changed) {
            this.emit("FACE_CHANGED", face);
        }

        if (MODES.includes(face)) {
            const sameMode = this.state.mode === face;
            if (sameMode && this.state.status === "PAUSED") {
                this.resume();
                return { changed: true, action: "RESUME" };
            }
            if (sameMode && this.state.status === "RUNNING") {
                return { changed, action: "NONE" };
            }
            this.start(face);
            return { changed: true, action: "START" };
        }

        if (face === "PAUSE" && this.state.status === "RUNNING") {
            this.pause();
            return { changed: true, action: "PAUSE" };
        }
        return { changed, action: "NONE" };
    }

    applyCommand({ type, mode, targetState } = {}) {
        this.tick();
        switch (type) {
            case "START":
            case "SWITCH_MODE":
                if (!MODES.includes(mode)) return rejected("INVALID_MODE");
                this.start(mode);
                return { ...EXECUTED };
            case "PAUSE":
                if (this.state.status !== "RUNNING") return rejected("INVALID_STATE");
                this.pause();
                return { ...EXECUTED };
            case "RESUME":
                if (this.state.status !== "PAUSED") return rejected("INVALID_STATE");
                this.resume();
                return { ...EXECUTED };
            case "STOP":
            case "RELEASE":
                // RELEASE: the browser continues the phase, the cube becomes idle.
                this.stop();
                return { ...EXECUTED };
            case "SET_STATE":
                return this.setState(mode, targetState);
            default:
                return rejected("INVALID_COMMAND");
        }
    }

    /** Continue a phase handed over by the browser, counting to the same end moment. */
    setState(mode, targetState) {
        if (!isValidTarget(mode, targetState)) {
            return rejected("INVALID_TARGET");
        }
        this.state = this.freshState(mode, targetState.status);
        this.state.durationSeconds = targetState.durationSeconds;
        this.state.remainingSeconds = targetState.remainingSeconds;
        this.state.sessionId = targetState.sessionId;

        if (targetState.status === "RUNNING") {
            const knowsServerClock = Number.isFinite(targetState.endsAt) && Number.isFinite(this.clockOffset);
            this.state.startedAt = this.now();
            this.state.localEndsAt = knowsServerClock
                ? targetState.endsAt - this.clockOffset
                : this.now() + targetState.remainingSeconds * 1000;
            this.emit(EVENTS.start);
        } else {
            this.state.pausedAt = this.now();
            this.emit(EVENTS.pause);
        }
        return { ...EXECUTED };
    }
}
