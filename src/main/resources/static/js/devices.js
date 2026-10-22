(function () {
    "use strict";
    document.addEventListener("DOMContentLoaded", () => {
        const list = document.querySelector("[data-devices-list]");
        if (!list) return;
        const empty = document.querySelector("[data-empty-state]");
        const message = document.querySelector("[data-page-message]");
        const wizard = document.querySelector("[data-wizard]");
        const wizardTitle = document.querySelector("[data-wizard-title]");
        const wizardContent = document.querySelector("[data-wizard-content]");
        const wizardActions = document.querySelector("[data-wizard-actions]");
        const wizardMessage = document.querySelector("[data-wizard-message]");
        const csrf = document.querySelector('meta[name="_csrf"]')?.content;
        const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;
        const state = {
            devices: [],
            pairing: null,
            poll: null,
            countdown: null,
            unsubscribeStatus: null,
            renderPending: false
        };

        function headers(json = false) {
            const result = {};
            if (json) {
                result["Content-Type"] = "application/json";
            }
            if (csrf && csrfHeader) {
                result[csrfHeader] = csrf;
            }
            return result;
        }
        const setMessage = (node, text, bad = false) => {
            node.textContent = text;
            node.classList.toggle("hidden", !text);
            node.classList.toggle("form-message--error", bad);
            node.classList.toggle("form-message--success", Boolean(text) && !bad);
        };
        async function json(response, fallback) {
            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (_) {
                data = null;
            }
            if (!response.ok) {
                throw Object.assign(new Error(data?.message || fallback), { code: data?.errorCode });
            }
            return data;
        }
        async function request(url, options, fallback) {
            return json(await fetch(url, options), fallback);
        }
        function relative(time) {
            if (!time) return "Never seen";
            const seconds = Math.max(0, Math.round((Date.now() - Number(time)) / 1000));
            if (seconds < 60) return "Just now";
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
            return `${Math.floor(seconds / 86400)}d ago`;
        }
        function add(parent, tag, text, className) {
            const el = document.createElement(tag);
            if (text !== undefined) el.textContent = text;
            if (className) el.className = className;
            parent.appendChild(el);
            return el;
        }
        function metricLabel(key, value) {
            return `${key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())}: ${value}`;
        }
        function render() {
            list.replaceChildren();
            empty.classList.toggle("hidden", state.devices.length > 0);
            state.devices.forEach(device => {
                const card = add(list, "article", undefined, "device-card");
                card.dataset.deviceId = device.id;
                const head = add(card, "div", undefined, "device-card__head");
                add(head, "h2", device.name || "Unnamed cube");
                add(head, "span", device.status || "OFFLINE",
                    `device-badge device-badge--${String(device.status || "OFFLINE").toLowerCase()}`);
                const meta = add(card, "div", undefined, "device-meta");
                add(meta, "span", `Firmware ${device.firmwareVersion || "not reported"}`);
                const seen = add(meta, "time", `Last seen: ${relative(device.lastSeenAt)}`);
                if (device.lastSeenAt) {
                    seen.dateTime = new Date(device.lastSeenAt).toISOString();
                    seen.title = new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium", timeStyle: "short"
                    }).format(new Date(device.lastSeenAt));
                }
                if (device.metrics && Object.keys(device.metrics).length) {
                    const metrics = add(card, "div", undefined, "device-metrics");
                    Object.entries(device.metrics).forEach(([key, value]) => add(metrics, "span",
                        metricLabel(key, value)));
                }
                const rename = add(card, "form", undefined, "device-rename");
                const nameInput = add(rename, "input", undefined, "device-rename__input");
                nameInput.value = device.name || "";
                nameInput.maxLength = 40;
                nameInput.setAttribute("aria-label", "Device name");
                const renameButton = add(rename, "button", "Rename", "btn btn--secondary");
                renameButton.type = "submit";
                rename.addEventListener("submit", async event => {
                    event.preventDefault();
                    const name = nameInput.value.trim();
                    if (!name) return setMessage(message, "Enter a device name.", true);
                    try {
                        const updated = await request(`/api/devices/${device.id}`, {
                            method: "PATCH",
                            headers: headers(true),
                            body: JSON.stringify({ name })
                        }, "Could not rename device.");
                        updated.settings = device.settings;
                        state.devices = state.devices.map(item => item.id === device.id ? updated : item);
                        render();
                        setMessage(message, "Device renamed.");
                    } catch (error) {
                        setMessage(message, error.message, true);
                    }
                });
                const settings = add(card, "form", undefined, "device-settings");
                const settingsData = device.settings || {};
                const capabilities = settingsData.capabilities || device.capabilities || {};
                const toggles = [
                    ["vibrationEnabled", "Vibration", "vibration"],
                    ["soundEnabled", "Sound", "sound"]
                ];
                toggles.forEach(([key, label, capability]) => {
                    const labelEl = add(settings, "label", label, "device-toggle");
                    const input = add(labelEl, "input");
                    input.type = "checkbox";
                    input.name = key;
                    input.checked = Boolean(settingsData[key]);
                    if (capabilities[capability] !== true) add(labelEl, "small",
                        "not confirmed by firmware", "device-unconfirmed");
                });
                const rgbLabel = add(settings, "label", "RGB brightness");
                const range = add(rgbLabel, "input");
                range.type = "range";
                range.name = "rgbBrightness";
                range.min = "0";
                range.max = "100";
                range.value = String(settingsData.rgbBrightness ?? 50);
                if (capabilities.rgb !== true) add(rgbLabel, "small", "not confirmed by firmware",
                    "device-unconfirmed");
                const save = add(settings, "button", "Save settings", "btn btn--secondary");
                save.type = "submit";
                settings.addEventListener("submit", async event => {
                    event.preventDefault();
                    const payload = {
                        vibrationEnabled: settings.elements.vibrationEnabled.checked,
                        soundEnabled: settings.elements.soundEnabled.checked,
                        rgbBrightness: Number(settings.elements.rgbBrightness.value)
                    };
                    try {
                        const updated = await request(`/api/devices/${device.id}/settings`, {
                            method: "PUT", headers: headers(true), body: JSON.stringify(payload)
                        }, "Could not save settings.");
                        device.settings = updated;
                        const settingsMessage = updated.appliedOnDevice
                            ? "Applied on cube."
                            : "Saved, waiting for cube.";
                        setMessage(message, settingsMessage);
                        render();
                    } catch (error) {
                        setMessage(message, error.message, true);
                    }
                });
                const actions = add(card, "div", undefined, "device-actions");
                const unbind = add(actions, "button", "Unbind", "btn btn--secondary");
                unbind.type = "button";
                unbind.addEventListener("click", async () => {
                    const confirmed = window.confirm(
                        "Unbind this cube? Its secret stops working and the cube must be re-paired."
                    );
                    if (!confirmed) return;
                    try {
                        await request(`/api/devices/${device.id}`, {
                            method: "DELETE", headers: headers()
                        }, "Could not unbind device.");
                        state.devices = state.devices.filter(item => item.id !== device.id);
                        render();
                        setMessage(message, "Device unbound. Re-pair the cube to use it again.");
                    } catch (error) {
                        setMessage(message, error.message, true);
                    }
                });
            });
        }
        async function loadDevices() {
            try {
                state.devices = await request("/api/devices", {
                    headers: headers()
                }, "Could not load devices.");
                await Promise.all(state.devices.map(async d => {
                    try {
                        d.settings = await request(`/api/devices/${d.id}/settings`, {
                            headers: headers()
                        }, "");
                    } catch (_) {
                        d.settings = {};
                    }
                }));
                render();
            } catch (error) {
                setMessage(message, error.message, true);
                render();
            }
        }
        function clearWizard() {
            clearInterval(state.poll);
            clearInterval(state.countdown);
            state.poll = null;
            state.countdown = null;
            state.unsubscribeStatus?.();
            state.unsubscribeStatus = null;
            wizard.classList.add("hidden");
            wizardContent.replaceChildren();
            wizardActions.replaceChildren();
            setMessage(wizardMessage, "");
        }
        function action(label, fn, primary = true) {
            const button = add(wizardActions, "button", label,
                `btn btn--${primary ? "primary" : "secondary"}`);
            button.type = "button";
            button.addEventListener("click", fn);
            return button;
        }
        function wizardStep(title) {
            wizard.classList.remove("hidden");
            wizardTitle.textContent = title;
            wizardContent.replaceChildren();
            wizardActions.replaceChildren();
            setMessage(wizardMessage, "");
        }
        function startWizard() {
            wizardStep("Check browser support");
            if (!window.TelosBleProvisioning?.isSupported()) {
                const reason = window.TelosBleProvisioning?.unsupportedReason()
                    || "Bluetooth provisioning is unavailable. Use a supported browser.";
                add(wizardContent, "p", reason);
                return action("Close", clearWizard, false);
            }
            add(
                wizardContent,
                "p",
                "Use Chrome, Edge, or Opera on desktop or Android. Keep the cube nearby and unpaired."
            );
            action("Choose cube", chooseCube);
        }
        async function chooseCube() {
            try {
                wizardStep("Choose your cube");
                add(wizardContent, "p", "Choose the Telos Cube in the browser prompt.");
                const device = await TelosBleProvisioning.requestDevice();
                await TelosBleProvisioning.connect(device);
                const info = await TelosBleProvisioning.readDeviceInfo();
                if (info.provisioned) {
                    throw Object.assign(
                        new Error("This cube is already provisioned. Reset it before pairing."),
                        { code: "ALREADY_PROVISIONED" }
                    );
                }
                state.deviceInfo = info;
                wifiStep();
            } catch (error) {
                pairingError(error);
            }
        }
        function wifiStep() {
            wizardStep("Connect cube to Wi-Fi");
            add(
                wizardContent,
                "p",
                "Your Wi-Fi password is sent only to the cube over encrypted Bluetooth. "
                    + "It is never saved by this website."
            );
            const ssidField = add(wizardContent, "label", "Wi-Fi network", "wizard-field");
            const ssid = add(ssidField, "input", undefined, "settings-input");
            ssid.autocomplete = "off";
            const passField = add(wizardContent, "label", "Wi-Fi password", "wizard-field");
            const passWrap = add(passField, "div", undefined, "wizard-password");
            const password = add(passWrap, "input", undefined, "settings-input");
            password.type = "password";
            password.autocomplete = "new-password";
            const show = add(passWrap, "button", "Show", "btn btn--secondary");
            show.type = "button";
            show.addEventListener("click", () => {
                password.type = password.type === "password" ? "text" : "password";
                show.textContent = password.type === "password" ? "Show" : "Hide";
            });
            action("Send to cube", async () => {
                try {
                    await createPairingAndWrite(ssid.value, password.value);
                    password.value = "";
                    ssid.value = "";
                } catch (error) {
                    password.value = "";
                    pairingError(error);
                }
            });
            action("Cancel", async () => {
                try {
                    await TelosBleProvisioning.cancel();
                } finally {
                    clearWizard();
                }
            }, false);
        }
        async function createPairingAndWrite(ssid, password) {
            state.pairing = await request("/api/device-pairings", {
                method: "POST", headers: headers()
            }, "Could not create pairing.");
            statusStep();
            state.unsubscribeStatus = await TelosBleProvisioning.subscribeStatus(showStatus);
            await TelosBleProvisioning.writeProvisioning({
                ssid,
                password,
                pairingToken: state.pairing.pairingToken,
                apiBaseUrl: window.location.origin
            });
            startPoll();
        }
        function statusStep() {
            wizardStep("Pairing your cube");
            add(wizardContent, "p", "Connecting the cube to Wi-Fi and claiming it to your account.");
            const status = add(wizardContent, "p", "Waiting for cube…", "wizard-status");
            status.dataset.status = "";
            const countdown = add(wizardContent, "p", "", "wizard-status");
            const tick = () => {
                const seconds = Math.max(0, Math.ceil((state.pairing.expiresAt - Date.now()) / 1000));
                const minutes = Math.floor(seconds / 60);
                const remainder = String(seconds % 60).padStart(2, "0");
                countdown.textContent = `Pairing token expires in ${minutes}:${remainder}.`;
            };
            tick();
            state.countdown = setInterval(tick, 1000);
            action("Cancel", async () => {
                await TelosBleProvisioning.cancel();
                clearWizard();
            }, false);
        }
        function showStatus(status) {
            const node = wizardContent.querySelector("[data-status]");
            if (node) node.textContent = status.errorCode ? `${status.state}: ${status.errorCode}` : status.state;
            const failedStates = ["WIFI_FAILED", "PAIRING_FAILED", "INVALID_PAYLOAD"];
            if (failedStates.includes(status.state)) {
                pairingError(Object.assign(
                    new Error(status.errorCode || "Cube could not complete pairing."),
                    { code: status.errorCode }
                ));
            }
        }
        function startPoll() {
            clearInterval(state.poll);
            state.poll = setInterval(async () => {
                try {
                    const pairing = await request(`/api/device-pairings/${state.pairing.pairingId}`, {
                        headers: headers()
                    }, "Could not check pairing.");
                    if (pairing.status === "CLAIMED") pairingSuccess(pairing);
                    else if (pairing.status === "EXPIRED") {
                        pairingError(Object.assign(
                            new Error("The pairing token expired."),
                            { code: "PAIRING_TOKEN_EXPIRED" }
                        ));
                    }
                } catch (error) {
                    setMessage(wizardMessage, error.message, true);
                }
            }, 2000);
        }
        async function pairingSuccess(pairing) {
            clearInterval(state.poll);
            clearInterval(state.countdown);
            TelosBleProvisioning.disconnect();
            wizardStep("Cube paired");
            add(wizardContent, "p", `${pairing.deviceName || "Your cube"} is ready to use.`);
            action("Done", async () => {
                clearWizard();
                await loadDevices();
            });
        }
        function pairingError(error) {
            clearInterval(state.poll);
            clearInterval(state.countdown);
            const friendly = {
                BLUETOOTH_PERMISSION_DENIED: "Bluetooth permission was denied. Allow permission and try again.",
                CHOOSER_CLOSED: "No cube was selected.",
                DEVICE_UNREACHABLE: "The cube is out of range or disconnected.",
                WIFI_AUTH_FAILED: "The Wi-Fi password was rejected.",
                WIFI_NOT_FOUND: "That Wi-Fi network was not found.",
                WIFI_TIMEOUT: "The Wi-Fi connection timed out.",
                DEVICE_OWNED_BY_ANOTHER_USER: "This cube belongs to another account.",
                PAIRING_TOKEN_EXPIRED: "The pairing token expired. Create a new one and try again.",
                PAIRING_TOKEN_USED: "The pairing token was already used. Create a new one and try again."
            };
            wizardStep("Pairing needs attention");
            add(wizardContent, "p",
                friendly[error.code] || error.message || "Pairing could not be completed.");
            action("Try again", startWizard);
            action("Close", clearWizard, false);
        }
        /** Do not rebuild the cards while the user is typing in one of their forms. */
        function isEditing() {
            const focused = document.activeElement;
            return Boolean(focused && list.contains(focused) && focused.matches?.("input, select, textarea"));
        }

        function renderWhenIdle() {
            if (isEditing()) {
                state.renderPending = true;
                return;
            }
            state.renderPending = false;
            render();
        }

        list.addEventListener("focusout", () => {
            window.setTimeout(() => {
                if (state.renderPending && !isEditing()) {
                    state.renderPending = false;
                    render();
                }
            }, 0);
        });

        function findDevice(deviceId) {
            return state.devices.find(item => String(item.id) === String(deviceId));
        }

        function onLiveMessage(event) {
            if (event.type === "RESYNC" || event.type === "DEVICE_ADDED") {
                loadDevices();
                return;
            }
            const device = findDevice(event.deviceId);
            if (event.type === "DEVICE_REMOVED") {
                state.devices = state.devices.filter(item => String(item.id) !== String(event.deviceId));
                renderWhenIdle();
            } else if (event.type === "DEVICE_STATUS" && device) {
                device.status = event.status;
                device.lastSeenAt = event.lastSeenAt || device.lastSeenAt;
                renderWhenIdle();
            } else if (event.type === "DEVICE_UPDATED" && device && event.device) {
                // Sent on every heartbeat: update the data in place and keep the loaded settings.
                Object.assign(device, event.device, { settings: device.settings });
                renderWhenIdle();
            } else if (event.type === "SETTINGS" && device && event.settings) {
                device.settings = event.settings;
                renderWhenIdle();
            }
        }

        document.querySelector("[data-add-device]")?.addEventListener("click", startWizard);
        document.querySelector("[data-wizard-close]")?.addEventListener("click", clearWizard);
        window.TelosDeviceLive?.subscribe(onLiveMessage);
        loadDevices();
    });
})();
