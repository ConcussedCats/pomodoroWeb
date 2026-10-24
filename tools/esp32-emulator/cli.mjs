#!/usr/bin/env node
// Interactive software emulator of the ESP32 Pomodoro Flip Cube (not proof of hardware behaviour).
// Usage: node tools/esp32-emulator/cli.mjs --api http://localhost:8080 --hardware-id EMU000000001
//        [--state-file f.json]
import readline from "node:readline";

import { CubeState, FACES } from "./cube-state.mjs";
import { DeviceClient, JsonFileStorage, MemoryStorage } from "./device-client.mjs";

function parseArgs(argv) {
    const result = {};
    for (let index = 0; index < argv.length; index += 1) {
        if (argv[index].startsWith("--")) {
            result[argv[index].slice(2)] = argv[index + 1];
        }
    }
    return result;
}

const args = parseArgs(process.argv.slice(2));
if (!args.api || !args["hardware-id"]) {
    console.error("Usage: node tools/esp32-emulator/cli.mjs --api http://localhost:8080 "
        + "--hardware-id EMU000000001 [--state-file .emulator-state.json]");
    process.exit(2);
}

const cube = new CubeState();
const client = new DeviceClient({
    hardwareId: args["hardware-id"],
    apiBaseUrl: args.api,
    storage: args["state-file"] ? new JsonFileStorage(args["state-file"]) : new MemoryStorage(),
    cube
});

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function run(label, action) {
    try {
        const result = await action();
        const details = result ? `: ${JSON.stringify(result)}` : "";
        log(`${label}${details}`);
    } catch (error) {
        log(`${label} failed: ${error.message}`);
    }
}

async function syncNow() {
    if (!client.online) return null;
    return client.flushEvents();
}

let heartbeatTimer = null;
let pollTimer = null;

const tickTimer = setInterval(() => {
    if (cube.tick()) {
        log("timer finished");
        run("events", syncNow);
    }
}, 1000);

function startLoops() {
    clearInterval(heartbeatTimer);
    clearInterval(pollTimer);
    // Protocol rule: send queued events before the heartbeat.
    heartbeatTimer = setInterval(() => run("heartbeat", async () => {
        await syncNow();
        return client.heartbeat();
    }), client.intervals.heartbeatIntervalSeconds * 1000);
    pollTimer = setInterval(() => run("poll", () => client.pollCommands()),
        client.intervals.commandPollIntervalSeconds * 1000);
}

function stopAll(rl) {
    clearInterval(tickTimer);
    clearInterval(heartbeatTimer);
    clearInterval(pollTimer);
    rl.close();
}

async function handle(command, value, rl) {
    switch (command) {
        case "pair":
            await run("pair", async () => {
                const result = await client.pair(value);
                startLoops();
                return { deviceId: result.deviceId };
            });
            break;
        case "flip":
            await run("flip", async () => {
                if (!FACES.includes(value)) {
                    throw new Error(`face must be one of ${FACES.join(", ")}`);
                }
                const result = cube.applyFace(value);
                await syncNow();
                return result;
            });
            break;
        case "status":
            log(JSON.stringify({
                mode: client.mode,
                online: client.online,
                face: cube.face,
                state: cube.snapshot(),
                queuedEvents: cube.getEvents().length,
                intervals: client.intervals
            }, null, 2));
            break;
        case "offline":
            client.setOnline(false);
            log("offline simulation enabled, events are queued");
            break;
        case "online":
            await run("reconnect", () => client.reconnect());
            startLoops();
            break;
        case "heartbeat":
            await run("heartbeat", () => client.heartbeat());
            break;
        case "poll":
            await run("poll", () => client.pollCommands());
            break;
        case "quit":
        case "exit":
            stopAll(rl);
            return false;
        case undefined:
        case "":
            break;
        default:
            log("unknown command");
    }
    return true;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "cube> " });
log("ESP32 Pomodoro Flip Cube software emulator. Commands: pair <token>, flip <face>, "
    + "status, offline, online, heartbeat, poll, quit.");
startLoops();
rl.prompt();
rl.on("line", async (line) => {
    const [command, value] = line.trim().split(/\s+/, 2);
    if (await handle(command, value, rl)) {
        rl.prompt();
    }
});
