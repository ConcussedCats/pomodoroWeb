import test from "node:test";
import assert from "node:assert/strict";
import {
    CubeState
}
from "../../tools/esp32-emulator/cube-state.mjs";
import {
    DeviceClient, MemoryStorage
}
from "../../tools/esp32-emulator/device-client.mjs";
const clock = (value = 1_000_000) => ( {
    now: () => value, advance: ms => {
        value += ms;
    }
}
);
const response = (body, status = 200) => ( {
    ok: status >= 200 && status < 300, status, json: async () => body
}
);
function fakeFetch(script = []) {
    const requests = [];
    return {
        requests, fetch: async (url, options = {
        }
        ) => {
            requests.push( {
                url, options, body: options.body && JSON.parse(options.body)
            }
            );
            const next = script.shift();
            if (next instanceof Error) throw next;
            return next || response( {
            }
            );
        }
    };
}
test("every face rule row is mirrored", () => {
    const c = clock();
    const cube = new CubeState( {
        now: c.now, durations: {
            pomodoroMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 1
        }
    }
    );
    cube.applyFace("WORK");
    assert.equal(cube.state.status, "RUNNING");
    cube.applyFace("WORK");
    assert.equal(cube.state.status, "RUNNING");
    cube.applyFace("PAUSE");
    assert.equal(cube.state.status, "PAUSED");
    cube.applyFace("PAUSE");
    assert.equal(cube.state.status, "PAUSED");
    cube.applyFace("WORK");
    assert.equal(cube.state.status, "RUNNING");
    cube.applyFace("SHORT_BREAK");
    assert.equal(cube.state.mode, "SHORT_BREAK");
    assert.equal(cube.state.remainingSeconds, 60);
    cube.applyFace("DISPLAY");
    assert.equal(cube.state.mode, "SHORT_BREAK");
    cube.applyFace("TECH");
    assert.equal(cube.state.mode, "SHORT_BREAK");
}
);
test("pause and resume preserve session and frozen time", () => {
    const c = clock();
    const cube = new CubeState( {
        now: c.now, durations: {
            pomodoroMinutes: 1
        }
    }
    );
    cube.applyFace("WORK");
    const id = cube.state.sessionId;
    c.advance(12_100);
    cube.applyFace("PAUSE");
    assert.equal(cube.state.remainingSeconds, 48);
    c.advance(9999);
    cube.applyFace("WORK");
    assert.equal(cube.state.sessionId, id);
    assert.equal(cube.state.remainingSeconds, 48);
}
);
test("tick finishes a countdown", () => {
    const c = clock();
    const cube = new CubeState( {
        now: c.now, durations: {
            pomodoroMinutes: 1 / 60
        }
    }
    );
    cube.applyFace("WORK");
    c.advance(1000);
    assert.equal(cube.tick(), true);
    assert.equal(cube.state.status, "FINISHED");
    assert.equal(cube.state.remainingSeconds, 0);
}
);
test("commands execute and reject invalid state or mode", () => {
    const cube = new CubeState();
    assert.deepEqual(cube.applyCommand( {
        type: "RESUME"
    }
    ), {
        result: "REJECTED", errorCode: "INVALID_STATE"
    }
    );
    assert.deepEqual(cube.applyCommand( {
        type: "START"
    }
    ), {
        result: "REJECTED", errorCode: "INVALID_MODE"
    }
    );
    assert.equal(cube.applyCommand( {
        type: "START", mode: "WORK"
    }
    ).result, "EXECUTED");
    assert.equal(cube.applyCommand( {
        type: "PAUSE"
    }
    ).result, "EXECUTED");
}
);
test("pair is unauthenticated and device calls carry authentication", async () => {
    const f = fakeFetch([response( {
        deviceId: 1, deviceSecret: "secret"
    }
    , 201), response( {
        pendingCommands: 0
    }
    )]);
    const client = new DeviceClient( {
        hardwareId: "EMU", apiBaseUrl: "http://x", fetch: f.fetch
    }
    );
    await client.pair("token");
    await client.heartbeat();
    assert.equal(f.requests[0].options.headers.Authorization, undefined);
    assert.equal(f.requests[0].options.headers["X-Device-Id"], undefined);
    assert.equal(f.requests[1].options.headers.Authorization, "Device secret");
    assert.equal(f.requests[1].options.headers["X-Device-Id"], "EMU");
}
);
test("ack has prescribed payload and expired commands are not executed", async () => {
    const c = clock();
    const f = fakeFetch([response( {
        commands: [ {
            commandId: "a", type: "START", mode: "WORK", expiresAt: c.now() + 1
        }
        , {
            commandId: "old", type: "PAUSE", expiresAt: c.now() - 1
        }
        ]
    }
    ), response( {
    }
    )]);
    const client = new DeviceClient( {
        hardwareId: "EMU", apiBaseUrl: "http://x", fetch: f.fetch, now: c.now, storage: new MemoryStorage( {
            deviceSecret: "s"
        }
        )
    }
    );
    await client.pollCommands();
    assert.equal(f.requests.length, 2);
    assert.deepEqual(Object.keys(f.requests[1].body).sort(), ["errorCode", "result", "state"]);
    assert.equal(f.requests[1].body.result, "EXECUTED");
}
);
test("offline queue flushes in order on reconnect and server terminal results remove events", async () => {
    const c = clock();
    const cube = new CubeState( {
        now: c.now
    }
    );
    cube.applyFace("WORK");
    cube.applyFace("PAUSE");
    const events = cube.getEvents();
    assert.ok(events.every((e, i) => i === 0 || e.seq > events[i - 1].seq));
    const f = fakeFetch([response( {
        results: events.map((e, i) => ( {
            eventId: e.eventId, result: i ? "STALE" : "DUPLICATE"
        }
        ))
    }
    ), response( {
        pendingCommands: 0
    }
    ), response( {
        commands: []
    }
    )]);
    const client = new DeviceClient( {
        hardwareId: "EMU", apiBaseUrl: "http://x", fetch: f.fetch, now: c.now, storage: new MemoryStorage( {
            deviceSecret: "s"
        }
        ), cube
    }
    );
    client.setOnline(false);
    await assert.rejects(client.flushEvents(), /offline/);
    assert.equal(cube.getEvents().length, events.length);
    await client.reconnect();
    assert.equal(f.requests[0].body.events[0].seq, events[0].seq);
    assert.equal(cube.getEvents().length, 0);
}
);
test("401 unauthorized wipes stored secret and provisions", async () => {
    const f = fakeFetch([response( {
        errorCode: "DEVICE_UNAUTHORIZED"
    }
    , 401)]);
    const storage = new MemoryStorage( {
        deviceSecret: "gone"
    }
    );
    const client = new DeviceClient( {
        hardwareId: "EMU", apiBaseUrl: "http://x", fetch: f.fetch, storage
    }
    );
    await client.heartbeat();
    assert.deepEqual(await storage.get(), {
    }
    );
    assert.equal(client.mode, "PROVISIONING");
}
);
test("switch mode and stop commands reset the expected state", () => {
    const cube = new CubeState();
    cube.applyCommand( {
        type: "START", mode: "WORK"
    }
    );
    const first = cube.state.sessionId;
    cube.applyCommand( {
        type: "SWITCH_MODE", mode: "LONG_BREAK"
    }
    );
    assert.equal(cube.state.mode, "LONG_BREAK");
    assert.notEqual(cube.state.sessionId, first);
    cube.applyCommand( {
        type: "STOP"
    }
    );
    assert.equal(cube.state.status, "STOPPED");
}
);
test("re-delivered commands are acknowledged without executing twice", async () => {
    const f = fakeFetch([response( {
        commands: [ {
            commandId: "same", type: "START", mode: "WORK", expiresAt: Infinity
        }
        ]
    }
    ), response( {
    }
    ), response( {
        commands: [ {
            commandId: "same", type: "START", mode: "WORK", expiresAt: Infinity
        }
        ]
    }
    ), response( {
    }
    )]);
    const client = new DeviceClient( {
        hardwareId: "EMU", apiBaseUrl: "http://x", fetch: f.fetch, storage: new MemoryStorage( {
            deviceSecret: "s"
        }
        )
    }
    );
    await client.pollCommands();
    const id = client.cube.state.sessionId;
    await client.pollCommands();
    assert.equal(client.cube.state.sessionId, id);
    assert.deepEqual(f.requests[1].body, f.requests[3].body);
}
);
test("failed acknowledgement is replayed on the next delivery", async () => {
    const f = fakeFetch([response( {
        commands: [ {
            commandId: "same", type: "START", mode: "WORK", expiresAt: Infinity
        }
        ]
    }
    ), new Error("network"), response( {
        commands: [ {
            commandId: "same", type: "START", mode: "WORK", expiresAt: Infinity
        }
        ]
    }
    ), response( {
    }
    )]);
    const client = new DeviceClient( {
        hardwareId: "EMU", apiBaseUrl: "http://x", fetch: f.fetch, storage: new MemoryStorage( {
            deviceSecret: "s"
        }
        )
    }
    );
    await assert.rejects(client.pollCommands(), /network/);
    const id = client.cube.state.sessionId;
    await client.pollCommands();
    assert.equal(client.cube.state.sessionId, id);
    assert.equal(f.requests[3].body.state.sessionId, id);
}
);
test("unsynchronised clock produces null event timestamps", () => {
    const cube = new CubeState( {
        clockSynced: false
    }
    );
    cube.applyFace("WORK");
    assert.ok(cube.getEvents().every((event) => event.occurredAt === null));
}
);
test("configuration is fetched only after a changed hash and updates durations", async () => {
    const f = fakeFetch([response( {
        configHash: "one", pendingCommands: 0
    }
    ), response( {
        configHash: "one", timer: {
            pomodoroMinutes: 1, shortBreakMinutes: 2, longBreakMinutes: 3
        }
    }
    ), response( {
        configHash: "one", pendingCommands: 0
    }
    )]);
    const client = new DeviceClient( {
        hardwareId: "EMU", apiBaseUrl: "http://x", fetch: f.fetch, storage: new MemoryStorage( {
            deviceSecret: "s"
        }
        )
    }
    );
    await client.heartbeat();
    await client.heartbeat();
    assert.equal(f.requests.filter((request) => request.url.endsWith("/config")).length, 1);
    client.cube.applyFace("WORK");
    assert.equal(client.cube.state.durationSeconds, 60);
}
);
test("same mode while paused resumes", () => {
    const cube = new CubeState();
    cube.applyFace("WORK");
    cube.applyFace("PAUSE");
    cube.applyFace("WORK");
    assert.equal(cube.state.status, "RUNNING");
}
);
test("same mode while running has no timer event", () => {
    const cube = new CubeState();
    cube.applyFace("WORK");
    const count = cube.getEvents().length;
    cube.applyFace("WORK");
    assert.equal(cube.getEvents().length, count);
}
);
test("other mode while running starts a new session", () => {
    const cube = new CubeState();
    cube.applyFace("WORK");
    const id = cube.state.sessionId;
    cube.applyFace("SHORT_BREAK");
    assert.notEqual(cube.state.sessionId, id);
}
);
test("other mode while paused starts a new session", () => {
    const cube = new CubeState();
    cube.applyFace("WORK");
    const id = cube.state.sessionId;
    cube.applyFace("PAUSE");
    cube.applyFace("SHORT_BREAK");
    assert.notEqual(cube.state.sessionId, id);
}
);
test("pause face pauses a running timer", () => {
    const cube = new CubeState();
    cube.applyFace("WORK");
    cube.applyFace("PAUSE");
    assert.equal(cube.state.status, "PAUSED");
}
);
test("pause face does nothing while paused or stopped", () => {
    const cube = new CubeState();
    cube.applyFace("PAUSE");
    assert.equal(cube.state.status, "STOPPED");
    cube.applyFace("WORK");
    cube.applyFace("PAUSE");
    const count = cube.getEvents().length;
    cube.applyFace("PAUSE");
    assert.equal(cube.getEvents().length, count);
}
);
test("display and tech faces do not change timer state", () => {
    const cube = new CubeState();
    cube.applyFace("WORK");
    const state = cube.snapshot();
    cube.applyFace("DISPLAY");
    cube.applyFace("TECH");
    assert.deepEqual(cube.snapshot(), state);
}
);

test("SET_STATE running keeps the server end moment after late delivery", () => {
    const c = clock(1_000);
    const cube = new CubeState({ now: c.now });
    cube.setClockOffset(100);
    cube.applyCommand({ type: "SET_STATE", mode: "WORK", targetState: { status: "RUNNING", durationSeconds: 60, remainingSeconds: 60, endsAt: 61_100, sessionId: "one" } });
    c.advance(30_100);
    assert.equal(cube.getRemainingSeconds(), 30);
});

test("SET_STATE applies the clock offset", () => {
    const c = clock(1_000);
    const cube = new CubeState({ now: c.now });
    cube.setClockOffset(500);
    cube.applyCommand({ type: "SET_STATE", mode: "WORK", targetState: { status: "RUNNING", durationSeconds: 60, remainingSeconds: 60, endsAt: 61_500, sessionId: "one" } });
    assert.equal(cube.snapshot().endsAt, 61_500);
});

test("SET_STATE paused keeps its frozen remaining time", () => {
    const c = clock();
    const cube = new CubeState({ now: c.now });
    cube.applyCommand({ type: "SET_STATE", mode: "WORK", targetState: { status: "PAUSED", durationSeconds: 60, remainingSeconds: 19, sessionId: "one" } });
    c.advance(10_000);
    assert.equal(cube.getRemainingSeconds(), 19);
});

test("SET_STATE rejects invalid targets", () => {
    const cube = new CubeState();
    const result = cube.applyCommand({ type: "SET_STATE", mode: "BAD", targetState: {} });
    assert.equal(result.errorCode, "INVALID_TARGET");
});

test("RELEASE stops the cube and clears its session", () => {
    const cube = new CubeState();
    cube.applyFace("WORK");
    cube.applyCommand({ type: "RELEASE" });
    assert.equal(cube.state.status, "STOPPED");
    assert.equal(cube.state.sessionId, null);
});

test("running snapshots include server-clock endsAt", () => {
    const c = clock();
    const cube = new CubeState({ now: c.now });
    cube.setClockOffset(200);
    cube.applyFace("WORK");
    assert.equal(cube.snapshot().endsAt, 2_500_200);
});

test("client learns clock offsets from server responses", async () => {
    const c = clock(1_000);
    const f = fakeFetch([response({ deviceId: 1, deviceSecret: "s", serverTime: 1_300 }, 201)]);
    const client = new DeviceClient({ hardwareId: "EMU", apiBaseUrl: "http://x", fetch: f.fetch, now: c.now });
    await client.pair("token");
    assert.equal(client.clockOffset, 300);
});
