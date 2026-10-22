import { randomUUID } from "node:crypto";

export const MODES = ["WORK", "SHORT_BREAK", "LONG_BREAK"];
export const FACES = [...MODES, "PAUSE", "DISPLAY", "TECH"];

const EVENT_TYPES = {
    finish: "TIMER_FINISHED",
    pause: "TIMER_PAUSED",
    resume: "TIMER_RESUMED",
    start: "TIMER_STARTED",
    stop: "TIMER_STOPPED"
};

export class CubeState {
    constructor({
        now = () => Date.now(),
        clockSynced = true,
        bootId = randomUUID(),
        durations = {}
    } = {}) {
        this.now = now;
        this.clockSynced = clockSynced;
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
            phaseIndex: 0
        };
    }

    getRemainingSeconds() {
        if (this.state.status !== "RUNNING") return this.state.remainingSeconds;
        const endsAt = this.state.startedAt + this.state.remainingSeconds * 1000;
        return Math.max(0, Math.ceil((endsAt - this.now()) / 1000));
    }

    snapshot() {
        return { ...this.state };
    }

    getEvents() {
        return this.queue.map((event) => ({ ...event, state: { ...event.state } }));
    }

    removeEvents(ids) {
        const removedIds = new Set(ids);
        this.queue = this.queue.filter((event) => !removedIds.has(event.eventId));
    }

    emit(type, face) {
        const clockSynced = typeof this.clockSynced === "function"
            ? this.clockSynced()
            : this.clockSynced;
        const event = {
            eventId: randomUUID(),
            seq: ++this.seq,
            type,
            occurredAt: clockSynced ? this.now() : null,
            state: this.snapshot()
        };
        if (face) event.face = face;
        this.queue.push(event);
    }

    start(mode) {
        this.state = this.freshState(mode);
        this.state.startedAt = this.now();
        this.state.sessionId = randomUUID();
        this.emit(EVENT_TYPES.start);
    }

    pause() {
        this.state.remainingSeconds = this.getRemainingSeconds();
        this.state.status = "PAUSED";
        this.state.pausedAt = this.now();
        this.state.startedAt = null;
        this.emit(EVENT_TYPES.pause);
    }

    resume() {
        this.state.status = "RUNNING";
        this.state.startedAt = this.now();
        this.state.pausedAt = null;
        this.emit(EVENT_TYPES.resume);
    }

    stop() {
        this.state = this.freshState(this.state.mode, "STOPPED");
        this.emit(EVENT_TYPES.stop);
    }

    tick() {
        if (this.state.status !== "RUNNING" || this.getRemainingSeconds() !== 0) return false;
        this.state.remainingSeconds = 0;
        this.state.status = "FINISHED";
        this.state.startedAt = null;
        this.state.pausedAt = null;
        this.emit(EVENT_TYPES.finish);
        return true;
    }

    applyFace(face) {
        if (!FACES.includes(face)) return { changed: false, errorCode: "INVALID_FACE" };
        const faceChanged = this.face !== face;
        this.face = face;
        if (faceChanged) this.emit("FACE_CHANGED", face);
        if (MODES.includes(face)) {
            if (this.state.mode === face && this.state.status === "PAUSED") {
                this.resume();
                return { changed: true, action: "RESUME" };
            }
            if (this.state.mode === face && this.state.status === "RUNNING") {
                return { changed: faceChanged, action: "NONE" };
            }
            this.start(face);
            return { changed: true, action: "START" };
        }
        if (face === "PAUSE" && this.state.status === "RUNNING") {
            this.pause();
            return { changed: true, action: "PAUSE" };
        }
        return { changed: faceChanged, action: "NONE" };
    }

    applyCommand({ type, mode } = {}) {
        this.tick();
        if ((type === "START" || type === "SWITCH_MODE") && !MODES.includes(mode)) {
            return { result: "REJECTED", errorCode: "INVALID_MODE" };
        }
        if (type === "START" || type === "SWITCH_MODE") {
            this.start(mode);
            return { result: "EXECUTED", errorCode: null };
        }
        if (type === "PAUSE") {
            if (this.state.status !== "RUNNING") {
                return { result: "REJECTED", errorCode: "INVALID_STATE" };
            }
            this.pause();
            return { result: "EXECUTED", errorCode: null };
        }
        if (type === "RESUME") {
            if (this.state.status !== "PAUSED") {
                return { result: "REJECTED", errorCode: "INVALID_STATE" };
            }
            this.resume();
            return { result: "EXECUTED", errorCode: null };
        }
        if (type === "STOP") {
            this.stop();
            return { result: "EXECUTED", errorCode: null };
        }
        return { result: "REJECTED", errorCode: "INVALID_COMMAND" };
    }
}

function positive(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}
