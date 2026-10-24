# ESP32 Pomodoro Flip Cube emulator

This is a Node.js software emulator for exercising the Telos device protocol against a running server.

```sh
node tools/esp32-emulator/cli.mjs --api http://localhost:8080 --hardware-id EMU000000001
```

Use `pair <token>` first, then `flip WORK`, `flip PAUSE`, `status`, `offline`, and `online`. Add `--state-file .emulator-state.json` to retain pairing credentials between runs.

It is a software emulator, not proof of ESP32 hardware behaviour, sensors, timing, or networking behaviour.
