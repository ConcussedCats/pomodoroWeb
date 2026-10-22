import {
    readFile, writeFile
}
from "node:fs/promises";
import {
    CubeState
}
from "./cube-state.mjs";
export class MemoryStorage {
    constructor(initial = {
    }
    ) {
        this.value = {
            ...initial
        };
    }
    async get() {
        return {
            ...this.value
        };
    }
    async set(value) {
        this.value = {
            ...value
        };
    }
    async clear() {
        this.value = {
        };
    }
}
export class JsonFileStorage {
    constructor(path) {
        this.path = path;
    }
    async get() {
        try {
            return JSON.parse(await readFile(this.path, "utf8"));
        }
        catch (error) {
            if (error.code === "ENOENT") return {
            };
            throw error;
        }
    }
    async set(value) {
        await writeFile(this.path, JSON.stringify(value, null, 2));
    }
    async clear() {
        await this.set( {
        }
        );
    }
}
export class DeviceClient {
    constructor( {
        hardwareId, apiBaseUrl, fetch = globalThis.fetch, now = () => Date.now(),
            storage = new MemoryStorage(), cube = new CubeState( {
            now
        }
        ), firmwareVersion = "0.1.0", capabilities = {
            vibration: true, sound: true, rgb: true, display: false, imu: true
        }
    }
    = {
    }
    ) {
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
        this.intervals = {
            heartbeatIntervalSeconds: 30, commandPollIntervalSeconds: 3
        };
        this.executedCommands = new Map();
    }
    async _saved() {
        return this.storage.get();
    }
    async _request(path, options = {
    }
    , pair = false) {
        if (!this.online) throw new Error("offline");
        const saved = await this._saved();
        const headers = {
            ...(options.headers || {
            }
            )
        };
        if (!pair) {
            if (!saved.deviceSecret) throw new Error("not paired");
            headers.Authorization = `Device ${saved.deviceSecret}`;
            headers["X-Device-Id"] = this.hardwareId;
        }
        let response;
        try {
            response = await this.fetch(`${this.apiBaseUrl}${path}`, {
                ...options, headers
            }
            );
        }
        catch (error) {
            throw error;
        }
        if (response.status === 401) {
            const body = await json(response);
            if (body?.errorCode === "DEVICE_UNAUTHORIZED") {
                await this.storage.clear();
                this.mode = "PROVISIONING";
            }
        }
        return response;
    }
    async pair(pairingToken, apiBaseUrl = this.apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl.replace(/\/$/, "");
        const response = await this._request("/api/devices/pair", {
            method: "POST", headers: jsonHeaders(), body: JSON.stringify( {
                pairingToken, hardwareId: this.hardwareId, firmwareVersion: this.firmwareVersion,
                    protocolVersion: 1, name: "Pomodoro Cube", capabilities: this.capabilities
            }
            )
        }
        , true);
        if (!response.ok) throw new Error(`pair failed (${response.status})`);
        const body = await json(response);
        await this.storage.set( {
            deviceId: body.deviceId, deviceSecret: body.deviceSecret
        }
        );
        this.mode = "CONNECTED";
        this._intervals(body);
        return body;
    }
    async heartbeat( {
        pollPending = true
    }
    = {
    }
    ) {
        const response = await this._request("/api/devices/heartbeat", {
            method: "POST", headers: jsonHeaders(), body: JSON.stringify( {
                firmwareVersion: this.firmwareVersion, protocolVersion: 1,
                    capabilities: this.capabilities, metrics: {
                }
                , face: this.cube.face, state: this.cube.snapshot()
            }
            )
        }
        );
        if (!response.ok) return null;
        const body = await json(response);
        this._intervals(body);
        const changed = body.configHash && body.configHash !== this.configHash;
        if (changed) await this.fetchConfig();
        if (pollPending && body.pendingCommands > 0) await this.pollCommands();
        return body;
    }
    async fetchConfig() {
        const response = await this._request("/api/device/config");
        if (!response.ok) return null;
        const body = await json(response);
        this.configHash = body.configHash || this.configHash;
        if (body.timer) this.cube.configure(body);
        return body;
    }
    async flushEvents() {
        const events = this.cube.getEvents();
        if (!events.length) return null;
        const response = await this._request("/api/device/events", {
            method: "POST", headers: jsonHeaders(), body: JSON.stringify( {
                bootId: this.cube.bootId, events
            }
            )
        }
        );
        if (!response.ok) return null;
        const body = await json(response);
        const removable = new Set(["APPLIED", "DUPLICATE", "STALE", "IGNORED", "REJECTED"]);
        this.cube.removeEvents((body.results || []).filter(r => removable.has(r.result)).map(r => r.eventId));
        return body;
    }
    async pollCommands() {
        const response = await this._request("/api/device/commands");
        if (!response.ok) return null;
        const body = await json(response);
        for (const command of body.commands || []) {
            if (command.expiresAt < this.now()) continue;
            const stored = this.executedCommands.get(command.commandId);
            const outcome = stored || {
                ...this.cube.applyCommand(command), state: this.cube.snapshot()
            };
            if (!stored) this._rememberCommand(command.commandId, outcome);
            await this._request(`/api/device/commands/${encodeURIComponent(command.commandId)}/ack`, {
                method: "POST", headers: jsonHeaders(), body: JSON.stringify(outcome)
            }
            );
        }
        return body;
    }
    setOnline(online) {
        this.online = Boolean(online);
    }
    async reconnect() {
        this.online = true;
        await this.flushEvents();
        await this.heartbeat( {
            pollPending: false
        }
        );
        await this.pollCommands();
    }
    _intervals(body) {
        for (const key of Object.keys(this.intervals)) if (Number.isFinite(body[key])) this.intervals[key] = body[key];
    }
    _rememberCommand(commandId, outcome) {
        this.executedCommands.set(commandId, {
            ...outcome, state: {
                ...outcome.state
            }
        }
        );
        if (this.executedCommands.size > 16) this.executedCommands.delete(this.executedCommands.keys().next().value);
    }
}
const jsonHeaders = () => ( {
    "Content-Type": "application/json"
}
);
async function json(response) {
    return response.json();
}
