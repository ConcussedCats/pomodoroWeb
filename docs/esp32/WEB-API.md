# Telos web API for devices, timer sync and history

Used by the website (session cookie + CSRF header from the `_csrf` / `_csrf_header`
meta tags on every non-GET request). All times are epoch milliseconds. Errors use the
existing `ErrorDto` shape (`status`, `message`, `errorCode`, …). A device of another
user is always answered with `404 NOT_FOUND`.

## Devices

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/devices` | – | `DeviceDto[]` |
| GET | `/api/devices/{id}` | – | `DeviceDto` |
| PATCH | `/api/devices/{id}` | `{"name":"Desk cube"}` (1–40 chars) | `DeviceDto` |
| DELETE | `/api/devices/{id}` | – | `204`; the device secret stops working immediately |

```json
DeviceDto = {
  "id": 12, "hardwareId": "A1B2C3D4E5F6", "name": "Desk cube",
  "status": "ONLINE", "firmwareVersion": "0.1.0", "protocolVersion": 1,
  "lastSeenAt": 1761150000000, "createdAt": 1761000000000, "lastFace": "WORK",
  "capabilities": {"vibration": true, "sound": true, "rgb": true, "display": false, "imu": true},
  "metrics": {"wifiRssi": -61, "uptimeSeconds": 3600},
  "settingsApplied": true
}
```

`capabilities` / `metrics` contain only what the firmware reported (may be `{}`).

## Pairing

| Method | Path | Response |
|---|---|---|
| POST | `/api/device-pairings` | `201 {"pairingId":5,"pairingToken":"…","status":"CREATED","expiresAt":…}` — opening a new one expires the user's previous open pairing |
| GET | `/api/device-pairings/{id}` | `{"pairingId":5,"status":"CREATED|CLAIMED|EXPIRED","expiresAt":…,"deviceId":12,"deviceName":"Pomodoro Cube"}` |

## Connected timer

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/devices/{id}/state` | – | `TimerStateDto` |
| POST | `/api/devices/{id}/commands` | `{"type":"START","mode":"WORK","clientRequestId":"uuid"}` | `202 CommandDto` (`status: PENDING`) |
| GET | `/api/devices/{id}/commands` | – | last 20 `CommandDto` |

* `type`: `START` (needs `mode`), `PAUSE`, `RESUME`, `STOP`, `SWITCH_MODE` (needs `mode`),
  `SET_STATE` (needs `mode` and `targetState`, hands the browser phase to the cube) and
  `RELEASE` (the browser continues the cube phase).
* `targetState` for `SET_STATE`:
  `{"status":"RUNNING|PAUSED","durationSeconds":1500,"remainingSeconds":1121,"endsAt":1761151121000,
  "sessionId":"uuid","sessionStartedAt":1761149800000,"cycleIndex":0,"phaseIndex":2}` —
  `endsAt` (server clock) is required for `RUNNING`, `remainingSeconds` for `PAUSED`;
  `400 TARGET_REQUIRED` / `400 INVALID_TARGET` otherwise.
* `mode` accepts `WORK`/`SHORT_BREAK`/`LONG_BREAK` or the browser names
  `pomodoro`/`short-break`/`long-break`.
* `409 DEVICE_OFFLINE` when the cube is offline; `409 COMMAND_IN_PROGRESS` while the previous
  command is still waiting for the cube; `400 MODE_REQUIRED`.
* Repeating the same `clientRequestId` returns the same command (no duplicate).
* The command is done only when its status becomes `EXECUTED` (via WebSocket or by
  polling `GET …/commands`); `REJECTED` and `EXPIRED` are failures.

```json
TimerStateDto = {
  "deviceId": 12, "mode": "WORK", "webMode": "pomodoro", "status": "RUNNING",
  "durationSeconds": 1500, "remainingSeconds": 1500,
  "startedAt": 1761150000000, "pausedAt": null, "endsAt": 1761151500000,
  "sessionId": "…", "cycleIndex": 0, "phaseIndex": 0, "totalCycles": 4,
  "workPhasesPerCycle": 4, "filledDots": 1, "patternType": "classic",
  "sessionCompleted": false, "suggestedNextMode": "SHORT_BREAK",
  "version": 8, "updatedAt": 1761150000000, "serverTime": 1761150000123
}
CommandDto = {
  "commandId": "…", "deviceId": 12, "type": "PAUSE", "mode": null,
  "status": "PENDING|DELIVERED|EXECUTED|REJECTED|EXPIRED", "errorCode": null,
  "createdAt": …, "expiresAt": …, "completedAt": null, "resultingVersion": null
}
```

How the website moves the phase between the browser and the cube is described in
PROTOCOL.md 1.4 (`connected-timer.js` implements it, `connected-state.js` has the pure
conversions `browserToCubeCommand` / `cubeToBrowserState`).

Countdown on the client: when `status == RUNNING`, remaining =
`max(0, ceil((endsAt - correctedNow) / 1000))` where
`correctedNow = Date.now() + (serverTime - Date.now() at response time)`.

## Device settings

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/devices/{id}/settings` | – | `DeviceSettingsDto` |
| PUT | `/api/devices/{id}/settings` | `{"vibrationEnabled":true,"soundEnabled":false,"rgbBrightness":40}` | `DeviceSettingsDto` |

```json
DeviceSettingsDto = {
  "deviceId": 12, "vibrationEnabled": true, "soundEnabled": false, "rgbBrightness": 40,
  "updatedAt": …, "appliedOnDevice": false,
  "capabilities": {"vibration": true, "sound": true, "rgb": true}
}
```

`appliedOnDevice` becomes `true` after the cube fetched the new config (its heartbeat
reports the current `configHash`). A setting whose capability is not `true` has not
been confirmed by the firmware and must be shown as such.

## History

| Method | Path | Response |
|---|---|---|
| GET | `/api/pomodoro-sessions?page=0&size=20` | `{"items":[SessionDto],"page":0,"size":20,"totalItems":3,"totalPages":1}` newest first |
| GET | `/api/pomodoro-sessions/stats?tz=Europe/Kyiv` | `SessionStatsDto` |
| POST | `/api/pomodoro-sessions` | browser timer session, `201` (or `200` with the existing row when `externalId` was already recorded) |

```json
SessionDto = {
  "id": 1, "externalId": "…", "type": "WORK", "webMode": "pomodoro",
  "source": "WEB|DEVICE", "status": "IN_PROGRESS|COMPLETED|INTERRUPTED",
  "deviceId": null, "plannedDurationSeconds": 1500, "actualDurationSeconds": 1500,
  "startedAt": …, "finishedAt": …
}
SessionStatsDto = {
  "timeZone": "Europe/Kyiv",
  "today": {"completedWorkSessions": 3, "interruptedSessions": 1, "focusSeconds": 4800, "breakSeconds": 900},
  "week":  {"completedWorkSessions": 9, "interruptedSessions": 2, "focusSeconds": 15000, "breakSeconds": 3000},
  "days": [{"date": "2026-10-16", "completedWorkSessions": 1, "focusSeconds": 1500}, "… 7 entries, oldest first"]
}
RecordSessionRequest = {
  "externalId": "uuid", "type": "pomodoro|short-break|long-break|WORK|…",
  "status": "COMPLETED|INTERRUPTED", "plannedDurationSeconds": 1500,
  "actualDurationSeconds": 1320, "startedAt": …, "finishedAt": …
}
```

## WebSocket `/ws/devices`

Same-origin, authenticated by the login session; messages are server → browser only.
Use `window.TelosDeviceLive` (`static/js/device-live.js`) instead of opening sockets
directly. Message types: `TIMER_STATE`, `DEVICE_STATUS`, `COMMAND`, `DEVICE_ADDED`,
`DEVICE_UPDATED`, `DEVICE_REMOVED`, `SETTINGS` — see PROTOCOL.md section 7.
