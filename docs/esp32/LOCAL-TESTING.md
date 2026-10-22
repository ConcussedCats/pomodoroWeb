# Local testing

No PostgreSQL install and no Docker are needed: tests and the local launcher use real
PostgreSQL binaries from `io.zonky.test:embedded-postgres` (test scope only).

## 1. Run all automated tests

```bash
./mvnw test
```

Java unit + integration tests. Integration tests start an embedded PostgreSQL, apply all
Flyway migrations V1..V9 and exercise the real HTTP API with a simulated ESP32
(`SimulatedCube`), a real WebSocket client and a real form login.

```bash
npm ci
npm run test:unit:js
```

JavaScript unit tests (timer state, Connected Mode, session recorder, device and history
pages with a fake DOM, BLE adapter with a fake `navigator.bluetooth`, Node emulator).

```bash
E2E_BASE_URL=http://localhost:8080 E2E_DEV_BASE_URL=http://localhost:8080 npx playwright test
```

Existing Playwright e2e suite against the local app (start it first, see 2). Without the
variables the suite targets the production site.

## 2. Run the app locally

```bash
./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.example.telos.LocalDevApplication
```

Open http://localhost:8080, register an account (data is stored in
`target/local-postgres` until `mvn clean`).

## 3. Pair the software cube

1. Log in, open **Devices**. In the browser console create a pairing token:

   ```js
   await (await fetch("/api/device-pairings", { method: "POST", headers: {
       [document.querySelector('meta[name="_csrf_header"]').content]:
           document.querySelector('meta[name="_csrf"]').content } })).json()
   ```

   (The **Add device** button needs a real cube over Bluetooth.)
2. Start the emulator and pair it with the token:

   ```bash
   node tools/esp32-emulator/cli.mjs --api http://localhost:8080 --hardware-id EMU000000001
   ```

   ```text
   cube> pair <pairingToken>
   cube> flip WORK
   cube> flip PAUSE
   cube> offline
   cube> flip WORK
   cube> online
   ```

3. On the timer page choose the cube in **Timer** above the timer. Pause / start / mode
   buttons now send commands; the cube polls them every 3 s and the website shows the
   result only after the cube acknowledged it.
4. Quit the emulator: after 90 s the cube is shown as OFFLINE.

## What the automated tests do not prove

They prove the server side of the protocol and the web UI logic. They do not prove that
real firmware, BLE stack, Wi-Fi or the MPU6050 behave as documented — see
[HARDWARE-CHECKLIST.md](HARDWARE-CHECKLIST.md).
