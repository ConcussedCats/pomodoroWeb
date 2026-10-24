# BLE GATT provisioning contract (v1)

Used once per pairing: the Telos website (Web Bluetooth) gives the cube Wi-Fi
credentials and a one-time pairing token. After that the cube talks to the server
over HTTPS only (see [PROTOCOL.md](PROTOCOL.md)). Nothing here has been tested on real
hardware yet.

## Advertising

* Local name: `Telos-Cube-XXXX` (`XXXX` = last 4 hex chars of `hardwareId`).
* Advertises the provisioning service UUID while it has no stored device secret, or
  after a long press of the reset button.
* Stops advertising after successful pairing.

## Service `7e1a0001-5c1e-4c3a-9f2e-6b7d0c0f1a00`

| Characteristic | UUID | Properties | Payload (UTF-8 JSON) |
|---|---|---|---|
| Device info | `7e1a0002-5c1e-4c3a-9f2e-6b7d0c0f1a00` | read | `{"hardwareId":"A1B2C3D4E5F6","firmwareVersion":"0.1.0","protocolVersion":1,"provisioned":false,"capabilities":{"vibration":true,"sound":true,"rgb":true,"display":false,"imu":true}}` |
| Provisioning | `7e1a0003-5c1e-4c3a-9f2e-6b7d0c0f1a00` | write (with response), **encrypted** | `{"v":1,"ssid":"…","password":"…","pairingToken":"…","apiBaseUrl":"https://teclos.space"}` |
| Status | `7e1a0004-5c1e-4c3a-9f2e-6b7d0c0f1a00` | read, notify | `{"state":"WIFI_CONNECTING","errorCode":null}` |
| Control | `7e1a0005-5c1e-4c3a-9f2e-6b7d0c0f1a00` | write (with response) | `{"cmd":"CANCEL"}` |

* The provisioning payload is at most 512 bytes (Web Bluetooth performs a long write;
  the firmware must accept prepared/long writes, e.g. NimBLE does).
* `ssid` ≤ 32 bytes, `password` ≤ 64 bytes (empty for open networks),
  `apiBaseUrl` must be `https://…` in production (`http://localhost…` is accepted only
  by debug builds).
* The provisioning characteristic must require an encrypted link
  (`ESP_GATT_PERM_WRITE_ENCRYPTED` / NimBLE `BLE_GATT_CHR_F_WRITE_ENC`), so the Wi-Fi
  password is never sent in clear over the air. The OS shows its pairing prompt on the
  first write.
* The firmware keeps the Wi-Fi password only in NVS (encrypted NVS recommended) and
  never logs it. The server never receives it.

## Status states

| `state` | Meaning | `errorCode` |
|---|---|---|
| `IDLE` | Waiting for credentials | – |
| `CREDENTIALS_RECEIVED` | Payload parsed | – |
| `WIFI_CONNECTING` | Joining the network | – |
| `WIFI_FAILED` | Could not join | `WIFI_AUTH_FAILED`, `WIFI_NOT_FOUND`, `WIFI_TIMEOUT` |
| `PAIRING` | Calling `POST /api/devices/pair` | – |
| `PAIRED` | Secret stored in NVS, provisioning finished | – |
| `PAIRING_FAILED` | Server refused or is unreachable | `PAIRING_TOKEN_INVALID`, `PAIRING_TOKEN_EXPIRED`, `PAIRING_TOKEN_USED`, `DEVICE_OWNED_BY_ANOTHER_USER`, `SERVER_UNREACHABLE`, `TLS_ERROR` |
| `INVALID_PAYLOAD` | JSON could not be parsed / fields too long | `INVALID_PAYLOAD` |

After `WIFI_FAILED`, `PAIRING_FAILED` or `INVALID_PAYLOAD` the cube returns to `IDLE`
and accepts a new provisioning write (the website asks for new credentials and, if the
token was used or expired, creates a new pairing session). `CANCEL` returns to `IDLE`.

## Website flow

1. `POST /api/device-pairings` → `pairingToken` (valid 5 minutes, one-time).
2. `navigator.bluetooth.requestDevice({ filters: [{ services: [SERVICE_UUID] }] })`.
3. Connect, read *Device info*, subscribe to *Status* notifications.
4. Write the provisioning JSON.
5. Show status notifications; at the same time poll `GET /api/device-pairings/{id}`
   until `CLAIMED` (success, the response has `deviceId`) or `EXPIRED`.
6. Disconnect GATT.

Web Bluetooth works only in Chromium-based browsers (Chrome, Edge, Opera; desktop and
Android) and only in a secure context (HTTPS or `http://localhost`). Safari / iOS and
Firefox do not support it; the website shows an explanation instead of the wizard.
