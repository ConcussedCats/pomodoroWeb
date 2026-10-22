import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
    readFileSync
}
from "node:fs";
function load( {
    bluetooth, secure = true
}
= {
}
) {
    const context = {
        window: null, navigator: {
            bluetooth
        }
        , TextEncoder, TextDecoder, JSON, Error
    };
    context.window = context;
    context.isSecureContext = secure;
    vm.createContext(context);
    vm.runInContext(readFileSync("src/main/resources/static/js/ble-provisioning.js", "utf8"), context);
    return context.TelosBleProvisioning;
}
test("BLE provisioning gives an actionable unsupported browser message", () => {
    const ble = load( {
        secure: false
    }
    );
    assert.equal(ble.isSupported(), false);
    assert.match(ble.unsupportedReason(), /Chrome, Edge, and Opera/);
}
);
test("BLE provisioning maps chooser and permission errors", async () => {
    for (const [name, code] of [["NotFoundError", "CHOOSER_CLOSED"], ["NotAllowedError",
        "BLUETOOTH_PERMISSION_DENIED"]]) {
        const ble = load( {
            bluetooth: {
                requestDevice: async () => {
                    const error = new Error();
                    error.name = name;
                    throw error;
                }
            }
        }
        );
        await assert.rejects(ble.requestDevice(), error => error.code === code);
    }
}
);
test("BLE provisioning validates UTF-8 field and total payload limits before writing", async () => {
    const ble = load( {
        bluetooth: {
        }
    }
    );
    await assert.rejects(ble.writeProvisioning( {
        ssid: "x".repeat(33), password: "", pairingToken: "t", apiBaseUrl: "https://x"
    }
    ), error => error.code === "SSID_TOO_LONG");
    await assert.rejects(ble.writeProvisioning( {
        ssid: "ok", password: "x".repeat(65), pairingToken: "t", apiBaseUrl: "https://x"
    }
    ), error => error.code === "PASSWORD_TOO_LONG");
}
);
