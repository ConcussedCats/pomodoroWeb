/* Web Bluetooth adapter for the Telos Cube provisioning GATT service. */
(function (root) {
    "use strict";
    const SERVICE_UUID = "7e1a0001-5c1e-4c3a-9f2e-6b7d0c0f1a00";
    const CHARACTERISTICS = Object.freeze( {
        DEVICE_INFO: "7e1a0002-5c1e-4c3a-9f2e-6b7d0c0f1a00",
        PROVISIONING: "7e1a0003-5c1e-4c3a-9f2e-6b7d0c0f1a00",
        STATUS: "7e1a0004-5c1e-4c3a-9f2e-6b7d0c0f1a00",
        CONTROL: "7e1a0005-5c1e-4c3a-9f2e-6b7d0c0f1a00"
    });
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let device = null;
    let server = null;
    let service = null;
    let statusCharacteristic = null;
    let statusListener = null;
    function browser() {
        return root.navigator || globalThis.navigator;
    }
    function error(code, message, cause) {
        const result = new Error(message);
        result.code = code;
        result.cause = cause;
        return result;
    }
    function mapError(cause) {
        if (cause && cause.code) return cause;
        const names = {
            NotFoundError: ["CHOOSER_CLOSED", "Bluetooth device selection was closed."],
            SecurityError: ["BLUETOOTH_PERMISSION_DENIED", "Bluetooth permission was denied."],
            NotAllowedError: ["BLUETOOTH_PERMISSION_DENIED", "Bluetooth permission was denied."],
            NetworkError: ["DEVICE_UNREACHABLE", "The cube is out of range or disconnected."]
        };
        const mapped = names[cause?.name] || ["BLUETOOTH_ERROR", "Bluetooth could not complete that action."];
        return error(mapped[0], mapped[1], cause);
    }
    function isSupported() {
        return Boolean(browser()?.bluetooth) && root.isSecureContext === true;
    }
    function unsupportedReason() {
        if (!browser()?.bluetooth) {
            return "Web Bluetooth is available in Chrome, Edge, and Opera on desktop and Android. "
                + "Safari, iOS, and Firefox are not supported.";
        }
        if (root.isSecureContext !== true) {
            return "Bluetooth provisioning needs a secure connection (HTTPS or localhost).";
        }
        return "";
    }
    function ensureSupported() {
        if (!isSupported()) throw error("BLUETOOTH_UNSUPPORTED", unsupportedReason());
    }
    function parseValue(value) {
        try {
            return JSON.parse(decoder.decode(value.buffer || value));
        }
        catch (cause) {
            throw error("INVALID_DEVICE_RESPONSE", "The cube sent an invalid response.", cause);
        }
    }
    async function characteristic(uuid) {
        if (!service) throw error("NOT_CONNECTED", "Choose and connect to a cube first.");
        return service.getCharacteristic(uuid);
    }
    async function requestDevice() {
        ensureSupported();
        try {
            device = await browser().bluetooth.requestDevice( {
                filters: [ {
                    services: [SERVICE_UUID]
                }]
            });
            device.addEventListener?.("gattserverdisconnected", () => {
                server = null;
                service = null;
                statusCharacteristic = null;
            });
            return device;
        } catch (cause) {
            throw mapError(cause);
        }
    }
    async function connect(selectedDevice) {
        ensureSupported();
        device = selectedDevice || device;
        if (!device?.gatt) throw error("NO_DEVICE", "Choose a cube first.");
        try {
            server = await device.gatt.connect();
            service = await server.getPrimaryService(SERVICE_UUID);
            return device;
        } catch (cause) {
            throw mapError(cause);
        }
    }
    async function readDeviceInfo() {
        try {
            return parseValue(await (await characteristic(CHARACTERISTICS.DEVICE_INFO)).readValue());
        }
        catch (cause) {
            throw mapError(cause);
        }
    }
    async function subscribeStatus(callback) {
        try {
            statusCharacteristic = await characteristic(CHARACTERISTICS.STATUS);
            statusListener = event => {
                try {
                    callback(parseValue(event.target.value));
                }
                catch (cause) {
                    callback( {
                        state: "INVALID_RESPONSE", errorCode: "INVALID_DEVICE_RESPONSE"
                    });
                }
            };
            statusCharacteristic.addEventListener("characteristicvaluechanged", statusListener);
            await statusCharacteristic.startNotifications();
            const current = await statusCharacteristic.readValue();
            callback(parseValue(current));
            return () => {
                statusCharacteristic?.removeEventListener?.("characteristicvaluechanged", statusListener);
                statusCharacteristic?.stopNotifications?.();
            };
        } catch (cause) {
            throw mapError(cause);
        }
    }
    async function writeProvisioning( {
        ssid, password, pairingToken, apiBaseUrl
    }) {
        const ssidBytes = encoder.encode(ssid || "");
        const passwordBytes = encoder.encode(password || "");
        if (ssidBytes.length > 32) throw error("SSID_TOO_LONG",
            "Wi-Fi network name must be 32 bytes or fewer.");
        if (passwordBytes.length > 64) throw error("PASSWORD_TOO_LONG",
            "Wi-Fi password must be 64 bytes or fewer.");
        const payload = {
            v: 1, ssid: String(ssid || ""), password: String(password || ""),
                pairingToken: String(pairingToken || ""), apiBaseUrl: String(apiBaseUrl || "")
        };
        const bytes = encoder.encode(JSON.stringify(payload));
        if (bytes.length > 512) throw error("PAYLOAD_TOO_LARGE",
            "Provisioning details exceed the cube's 512 byte limit.");
        try {
            const provisioning = await characteristic(CHARACTERISTICS.PROVISIONING);
            if (typeof provisioning.writeValueWithResponse === "function") {
                await provisioning.writeValueWithResponse(bytes);
            } else {
                await provisioning.writeValue(bytes);
            }
        } catch (cause) {
            throw mapError(cause);
        }
    }
    async function cancel() {
        try {
            const control = await characteristic(CHARACTERISTICS.CONTROL);
            const bytes = encoder.encode(JSON.stringify( {
                cmd: "CANCEL"
            }));
            if (typeof control.writeValueWithResponse === "function") await control.writeValueWithResponse(bytes);
            else await control.writeValue(bytes);
        }
        catch (cause) {
            throw mapError(cause);
        }
    }
    function disconnect() {
        statusCharacteristic?.removeEventListener?.("characteristicvaluechanged", statusListener);
        if (device?.gatt?.connected) device.gatt.disconnect();
        server = null;
        service = null;
        statusCharacteristic = null;
        statusListener = null;
    }
    root.TelosBleProvisioning = Object.freeze( {
        SERVICE_UUID, CHARACTERISTICS, isSupported, unsupportedReason, requestDevice, connect,
            readDeviceInfo, subscribeStatus, writeProvisioning, cancel, disconnect, mapError
    }
    );
}
)(window);
