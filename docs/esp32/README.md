# ESP32 Pomodoro Flip Cube integration

Server and web infrastructure for a physical Pomodoro cube based on ESP32. The firmware
does not exist yet; everything on the server side is implemented and tested against
software emulators.

| Document | What it is for |
|---|---|
| [PROTOCOL.md](PROTOCOL.md) | HTTPS protocol device ⇄ server, shared timer contract, face rules, versioning |
| [BLE-GATT.md](BLE-GATT.md) | Bluetooth provisioning contract (Wi-Fi + pairing token) |
| [WEB-API.md](WEB-API.md) | REST + WebSocket API used by the website |
| [LOCAL-TESTING.md](LOCAL-TESTING.md) | Running the app and the emulator locally, running all tests |
| [HARDWARE-CHECKLIST.md](HARDWARE-CHECKLIST.md) | What still has to be checked on a real cube |
| [FIRMWARE-TASKS.md](FIRMWARE-TASKS.md) | Work items for the ESP32 firmware |

## How the pieces fit

```
 Browser (Telos)                     Spring Boot                          ESP32 cube
 ───────────────                     ───────────                          ──────────
 My Devices ── Web Bluetooth ───────────────────────────────────────────▶ Wi-Fi + pairing token
            ── POST /api/device-pairings ─▶ one-time token (5 min, hash only)
                                            POST /api/devices/pair ◀───── token + hardwareId
                                            device secret (hash only) ──▶ stored in NVS
 Timer page ── POST .../commands ─────────▶ command PENDING
                                            GET /api/device/commands ◀── polling (3 s)
                                            POST .../ack ◀──────────────  executed + state
            ◀── WebSocket /ws/devices ───── TIMER_STATE / COMMAND / DEVICE_STATUS
                                            POST /api/device/events ◀──── face flips, offline queue
                                            POST /api/devices/heartbeat ◀ every 30 s
```

* **Standalone Mode** — the browser timer works exactly as before (localStorage, auto
  transitions, classic / compact).
* **Connected Device Mode** — a cube is selected above the timer. The cube is the only
  thing counting down; the website shows the server state and sends commands. The browser
  timer is paused while a cube is selected and comes back when you switch back.

## Code map

| Area | Location |
|---|---|
| Entities | `model/device/*`, `model/history/PomodoroSession` |
| Migrations | `db/migration/V7__add_devices_and_pairing.sql`, `V8__add_device_timer_sync.sql`, `V9__add_pomodoro_sessions.sql` |
| Device authentication | `security/device/*`, device chain in `SecurityConfig` |
| Pairing, devices, settings | `service/device/DevicePairingService`, `DeviceService`, `DeviceSettingsService` |
| Timer sync, commands, events | `service/device/DeviceTimerService`, `TimerPhasePlanner`, `CubeFacePolicy` |
| Heartbeat, ONLINE / OFFLINE | `service/device/DeviceProtocolService`, `DevicePresenceService`, `DeviceMaintenanceScheduler` |
| History and statistics | `service/history/PomodoroSessionService` |
| WebSocket | `websocket/*` |
| Website | `templates/devices.html`, `templates/history.html`, `static/js/connected-*.js`, `device-live.js`, `devices.js`, `ble-provisioning.js`, `history.js`, `session-recorder.js` |
| Emulators | `tools/esp32-emulator` (Node, manual testing), `src/test/.../integration/SimulatedCube.java` (Java tests) |

## Known limitations

* WebSocket sessions are kept in memory: correct for the current single-instance
  deployment, a second instance would need a shared broker.
* Behind a reverse proxy the proxy must forward WebSocket upgrades for `/ws/devices`,
  and forwarded headers must be configured so Spring's same-origin check sees the public
  host.
* History of the browser timer is recorded by the timer page; if several phases pass while
  no timer page is open, only the phase that was running when you come back is recorded.
* No JWT (`/api/jwt/**`) variants of the new user endpoints yet; the website uses the session.
* No rate limiting on pairing creation yet.
