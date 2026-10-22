# Checks that need a real cube

Verified so far: **nothing on hardware.** Everything below is implemented on the server
and website according to the protocol and covered by tests with software emulators only.

## Onboarding (BLE)

- [ ] The cube advertises `Telos-Cube-XXXX` with the provisioning service; Chrome / Edge
      on desktop and Android find it with the service filter.
- [ ] Writing the provisioning characteristic triggers OS pairing (encrypted link) and the
      Wi-Fi password is never readable in clear (check with a BLE sniffer).
- [ ] A 512-byte provisioning payload is accepted (long write / MTU).
- [ ] Status notifications arrive in order: `CREDENTIALS_RECEIVED → WIFI_CONNECTING → PAIRING → PAIRED`.
- [ ] Wrong password → `WIFI_FAILED / WIFI_AUTH_FAILED`; unknown SSID → `WIFI_NOT_FOUND`.
- [ ] Expired token (wait 5 min) → `PAIRING_FAILED / PAIRING_TOKEN_EXPIRED`, retry from the
      website works.
- [ ] Cube already linked to another account → `DEVICE_OWNED_BY_ANOTHER_USER`.
- [ ] Moving the phone out of range during the wizard shows "out of range or disconnected".
- [ ] HTTPS to the production server with certificate validation works.

## Timer and sync

- [ ] MPU6050 face detection is stable (no flicker between faces, debounce).
- [ ] Each face does what PROTOCOL.md section 5 says; DISPLAY and TECH change nothing.
- [ ] Countdown accuracy over 25 min compared with the website (< 1 s drift).
- [ ] Website Pause / Resume / Stop / mode switch reach the cube within ~3 s.
- [ ] Wi-Fi off for 10 min while flipping: the cube keeps counting; after reconnect the
      website shows the right state and history has no duplicates.
- [ ] Reboot during a session: new `bootId`, no stale events applied.
- [ ] Unbinding on the website: the cube gets 401 and returns to BLE provisioning.
- [ ] Heartbeat every 30 s; the website shows OFFLINE ~90 s after power-off.

## Hardware settings

- [ ] Vibration on/off, sound on/off, RGB brightness are applied after the config
      download and the website switches to "Applied on cube".
- [ ] Capabilities reported in heartbeats match the real hardware (no battery value is
      reported because there is no battery measurement).
