// HTTP side of the emulated cube: pairing, heartbeat, config, events and command polling
// (docs/esp32/PROTOCOL.md sections 2-4).
import { readFile, writeFile } from "node:fs/promises";

import { CubeState } from "./cube-state.mjs";

const TERMINAL_EVENT_RESULTS = new Set(["APPLIED", "DUPLICATE", "STALE", "IGNORED", "REJECTED"]);
const REMEMBERED_COMMANDS = 16;
const DEFAULT_CAPABILITIES = { vibration: true, sound: true, rgb: true, display: false, imu: true };

/** Simulates NVS in memory. */
export class MemoryStorage {
    constructor(initial = {}) {
        this.value = { ...initial };
    }

    async get() {
        return { ...this.value };
    }

    async set(value) {
        this.value = { ...value };
    }

    async clear() {
        this.value = {};
    }
}

/** Simulates NVS in a JSON file, so the secret survives restarts of the CLI. */
export class JsonFileStorage {
    constructor(path) {
        this.path = path;
    }

    async get() {
        try {
            return JSON.parse(await readFile(this.path, "utf8"));
        } catch (error) {
            if (error.code === "ENOENT") return {};
            throw error;
        }
    }

    async set(value) {
        await writeFile(this.path, JSON.stringify(value, null, 2));
    }

    async clear() {
        await this.set({});
    }
}

function postJson(body) {
    return {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    };
}

async function json(response) {
    return response.json();
}

export class DeviceClient {
    constructor({
        hardwareId,
        apiBaseUrl,
        fetch = globalThis.fetch,
        now = () => Date.now(),
        storage = new MemoryStorage(),
        cube = new CubeState({ now }),
        firmwareVersion = "0.1.0",
        capabilities = DEFAULT_CAPABILITIES
    } = {}) {
        if (!hardwareId) throw new Error("hardwareId is required");
        this.hardwareId = hardwareId;
        this.apiBaseUrl = apiBaseUrl?.replace(/\/$/, "");
        this.fetch = fetch;
        this.now = now;
        this.storage = storage;
        this.cube = cube;
        this.firmwareVersion = firmwareVersion;
        this.capabilities = capabilities;
        this.online = true;
        this.mode = "PROVISIONING";
        this.configHash = null;
        this.clockOffset = null;
        this.intervals = { heartbeatIntervalSeconds: 30, commandPollIntervalSeconds: 3 };
        // Executed command ids with their ack, so a re-delivered command is acked again, not executed again.
        this.executedCommands = new Map();
    }

    async _request(path, options = {}, isPairing = false) {
        if (!this.online) throw new Error("offline");
        const saved = await this.storage.get();
        const headers = { ...(options.headers || {}) };
        if (!isPairing) {
            if (!saved.deviceSecret) throw new Error("not paired");
            headers.Authorization = `Device ${saved.deviceSecret}`;
            headers["X-Device-Id"] = this.hardwareId;
        }

        const response = await this.fetch(`${this.apiBaseUrl}${path}`, { ...options, headers });
        if (response.status === 401) {
            const body = await json(response);
            if (body?.errorCode === "DEVICE_UNAUTHORIZED") {
                // Secret revoked (unbound or re-paired): back to BLE provisioning.
                await this.storage.clear();
                this.mode = "PROVISIONING";
            }
        }
        return response;
    }

    async pair(pairingToken, apiBaseUrl = this.apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
        const body = {
            pairingToken,
            hardwareId: this.hardwareId,
            firmwareVersion: this.firmwareVersion,
            protocolVersion: 1,
            name: "Pomodoro Cube",
            capabilities: this.capabilities
        };
        const response = await this._request("/api/devices/pair", postJson(body), true);
        if (!response.ok) throw new Error(`pair failed (${response.status})`);

        const result = await json(response);
        this._learnClock(result);
        await this.storage.set({ deviceId: result.deviceId, deviceSecret: result.deviceSecret });
        this.mode = "CONNECTED";
        this._learnIntervals(result);
        return result;
    }

    async heartbeat({ pollPending = true } = {}) {
        const body = {
            firmwareVersion: this.firmwareVersion,
            protocolVersion: 1,
            capabilities: this.capabilities,
            metrics: {},
            face: this.cube.face,
            configHash: this.configHash,
            state: this.cube.snapshot()
        };
        const response = await this._request("/api/devices/heartbeat", postJson(body));
        if (!response.ok) return null;

        const result = await json(response);
        this._learnClock(result);
        this._learnIntervals(result);
        if (result.configHash && result.configHash !== this.configHash) {
            await this.fetchConfig();
        }
        if (pollPending && result.pendingCommands > 0) {
            await this.pollCommands();
        }
        return result;
    }

    async fetchConfig() {
        const response = await this._request("/api/device/config");
        if (!response.ok) return null;

        const result = await json(response);
        this._learnClock(result.state);
        this.configHash = result.configHash || this.configHash;
        if (result.timer) {
            this.cube.configure(result);
        }
        return result;
    }

    async flushEvents() {
        const events = this.cube.getEvents();
        if (!events.length) return null;

        const response = await this._request("/api/device/events", postJson({ bootId: this.cube.bootId, events }));
        if (!response.ok) return null;

        const result = await json(response);
        this._learnClock(result.state);
        const handled = (result.results || [])
            .filter(item => TERMINAL_EVENT_RESULTS.has(item.result))
            .map(item => item.eventId);
        this.cube.removeEvents(handled);
        return result;
    }

    async pollCommands() {
        const response = await this._request("/api/device/commands");
        if (!response.ok) return null;

        const result = await json(response);
        for (const command of result.commands || []) {
            if (this._isExpired(command)) continue;
            const stored = this.executedCommands.get(command.commandId);
            const outcome = stored || { ...this.cube.applyCommand(command), state: this.cube.snapshot() };
            if (!stored) {
                this._rememberCommand(command.commandId, outcome);
            }
            const path = `/api/device/commands/${encodeURIComponent(command.commandId)}/ack`;
            await this._request(path, postJson(outcome));
        }
        return result;
    }

    setOnline(online) {
        this.online = Boolean(online);
    }

    /** Reconnect order from PROTOCOL.md section 4: queue, heartbeat (with config), commands. */
    async reconnect() {
        this.online = true;
        await this.flushEvents();
        await this.heartbeat({ pollPending: false });
        await this.pollCommands();
    }

    /** expiresAt is on the server clock. */
    _isExpired(command) {
        const serverNow = this.now() + (this.clockOffset ?? 0);
        return command.expiresAt < serverNow;
    }

    _learnClock(body) {
        if (!Number.isFinite(body?.serverTime)) return;
        this.clockOffset = body.serverTime - this.now();
        this.cube.setClockOffset(this.clockOffset);
    }

    _learnIntervals(body) {
        for (const key of Object.keys(this.intervals)) {
            if (Number.isFinite(body[key])) {
                this.intervals[key] = body[key];
            }
        }
    }

    _rememberCommand(id, outcome) {
        this.executedCommands.set(id, { ...outcome, state: { ...outcome.state } });
        if (this.executedCommands.size > REMEMBERED_COMMANDS) {
            this.executedCommands.delete(this.executedCommands.keys().next().value);
        }
    }
}
