# ESP32 firmware tasks

Ordered roughly by dependency. Contract: [PROTOCOL.md](PROTOCOL.md), [BLE-GATT.md](BLE-GATT.md).
The Node emulator in `tools/esp32-emulator` is a working reference of the client logic.

1. **Identity and storage** — `hardwareId` from the eFuse MAC; NVS namespaces for Wi-Fi
   credentials, device secret, last config and config hash, event queue; encrypted NVS.
2. **BLE provisioning** (NimBLE) — service and four characteristics, encrypted write on
   the provisioning characteristic, long writes up to 512 bytes, status notifications,
   `CANCEL`, advertising only while unprovisioned or after a long reset press.
3. **Wi-Fi + time** — connect with stored credentials, reconnect with backoff, SNTP; send
   `occurredAt: null` / `startedAt: null` until the clock is synced.
4. **Pairing** — `POST /api/devices/pair` over HTTPS with certificate validation; store the
   secret; map errors to BLE status codes.
5. **Device HTTP client** — `Authorization: Device <secret>` + `X-Device-Id`; on 401
   `DEVICE_UNAUTHORIZED` erase the secret and return to provisioning.
6. **Face detection** — MPU6050 driver, gravity vector → face, debounce (e.g. 600 ms
   stable), face rules of PROTOCOL.md section 5.
7. **Local timer** — the state machine from the emulator (`cube-state.mjs`): sessions,
   pause / resume keeping `sessionId`, FINISHED without auto start, local countdown.
8. **Event queue** — `bootId` per boot, `seq`, UUID `eventId`; send immediately when online,
   persist while offline, flush oldest first; drop events the server answered.
9. **Heartbeat** — every 30 s with firmware version, capabilities, only measured metrics,
   current state and `configHash`; fetch config when the hash differs.
10. **Command polling** — every 3 s; execute, ack with resulting state; never execute an
    expired command (compare `expiresAt` with the server clock); remember the last 16
    executed command ids and re-send their ack.
11. **One timer with the website** — keep `clockOffset` from every `serverTime`; send
    `endsAt` while running; `SET_STATE` (continue the given phase to `endsAt`, keep the
    given `sessionId`) and `RELEASE` (become idle, the website continues the phase).
12. **Hardware feedback** — vibration motor, buzzer, RGB LED driven by the downloaded
    hardware settings; display of remaining time / suggested next phase if a display exists.
13. **Factory reset** — long press clears NVS (secret, Wi-Fi) and returns to provisioning.
14. Later (not part of this stage): OTA updates, MQTT / WebSocket instead of polling,
    battery measurement if hardware gets one.
