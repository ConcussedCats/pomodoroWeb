// Header device menu (chip icon next to the account icon), on every page for logged-in users:
// choose where the timer runs (this browser or a cube), see the cube status and change its hardware settings.
// On the timer page the choice is applied by connected-timer.js (with phase handover); on other pages the
// menu opens the timer page with ?timerSource=..., which applies it there.
(function () {
    "use strict";

    const SETTINGS_SAVE_DELAY_MS = 400;

    document.addEventListener("DOMContentLoaded", () => {
        const menu = document.querySelector("[data-device-menu]");
        const connectedState = window.TelosConnectedState;
        if (!menu || !connectedState) return;

        const label = menu.querySelector("[data-device-menu-label]");
        const statusPill = menu.querySelector("[data-device-menu-status]");
        const count = menu.querySelector("[data-device-menu-count]");
        const sources = menu.querySelector("[data-device-menu-sources]");
        const sync = menu.querySelector("[data-device-menu-sync]");
        const controls = menu.querySelector("[data-device-menu-controls]");
        const controlsTitle = menu.querySelector("[data-device-menu-controls-title]");
        const brightness = menu.querySelector("[data-device-menu-brightness]");
        const brightnessValue = menu.querySelector("[data-device-menu-brightness-value]");
        const vibration = menu.querySelector("[data-device-menu-vibration]");
        const sound = menu.querySelector("[data-device-menu-sound]");
        const note = menu.querySelector("[data-device-menu-note]");

        const state = {
            devices: [],
            activeId: connectedState.getActiveDeviceId(),
            syncText: "",
            syncTone: "idle",
            pending: false,
            settings: null,
            settingsDeviceId: null,
            saveTimer: null
        };

        function csrfHeaders() {
            const token = document.querySelector('meta[name="_csrf"]')?.content;
            const header = document.querySelector('meta[name="_csrf_header"]')?.content;
            return {
                "Content-Type": "application/json",
                ...(token && header ? { [header]: token } : {})
            };
        }

        async function requestJson(url, options = {}) {
            const response = await fetch(url, { credentials: "same-origin", ...options });
            if (!response.ok) {
                throw new Error(`Request failed (${response.status})`);
            }
            return response.json();
        }

        function relativeTime(epochMillis) {
            if (!epochMillis) return "never seen";
            const seconds = Math.max(0, Math.round((Date.now() - Number(epochMillis)) / 1000));
            if (seconds < 60) return "seen just now";
            if (seconds < 3600) return `seen ${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `seen ${Math.floor(seconds / 3600)}h ago`;
            return `seen ${Math.floor(seconds / 86400)}d ago`;
        }

        function activeDevice() {
            return state.devices.find(device => device.id === state.activeId) || null;
        }

        /** Cube whose quick settings are shown: the active one, otherwise the only/first one. */
        function settingsDevice() {
            return activeDevice() || state.devices[0] || null;
        }

        // ------------------------------------------------------------ rendering

        function renderToggle() {
            const device = activeDevice();
            label.textContent = device ? "Cube" : "Browser";
            statusPill.classList.toggle("hidden", !device);
            if (device) {
                statusPill.textContent = device.status === "ONLINE" ? "Online" : "Offline";
                statusPill.dataset.status = device.status === "ONLINE" ? "online" : "offline";
            }
            menu.dataset.source = device ? "cube" : "browser";
            menu.dataset.pending = String(state.pending);
        }

        function sourceButton(value, title, subtitle, status) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "device-menu__source";
            button.dataset.source = value;
            const isActive = value === "browser" ? !state.activeId : Number(value) === state.activeId;
            button.setAttribute("aria-pressed", isActive ? "true" : "false");

            const dot = document.createElement("span");
            dot.className = "device-menu__dot";
            dot.dataset.status = status;
            const text = document.createElement("span");
            text.className = "device-menu__source-text";
            const name = document.createElement("span");
            name.className = "device-menu__source-name";
            name.textContent = title;
            const meta = document.createElement("span");
            meta.className = "device-menu__source-meta";
            meta.textContent = subtitle;
            text.append(name, meta);
            button.append(dot, text);
            button.addEventListener("click", () => chooseSource(value));
            return button;
        }

        let renderedSources = "";

        function renderSources() {
            // Rebuild only on real changes: the timer page reports its status every second.
            const signature = JSON.stringify([
                state.activeId,
                state.devices.map(device => [device.id, device.name, device.status, relativeTime(device.lastSeenAt)])
            ]);
            if (signature === renderedSources) return;
            renderedSources = signature;

            const buttons = [sourceButton("browser", "This browser", "Timer in this browser", "browser")];
            state.devices.forEach((device) => {
                const online = device.status === "ONLINE";
                buttons.push(sourceButton(
                    String(device.id),
                    device.name || "Pomodoro Cube",
                    `${online ? "Online" : "Offline"} · ${relativeTime(device.lastSeenAt)}`,
                    online ? "online" : "offline"
                ));
            });
            sources.replaceChildren(...buttons);
            count.textContent = state.devices.length === 1 ? "1 cube" : `${state.devices.length} cubes`;
        }

        function fallbackSyncText() {
            const device = activeDevice();
            if (!device) return { text: "", tone: "idle" };
            if (device.status !== "ONLINE") {
                return { text: "Cube offline. Showing the last known state.", tone: "warning" };
            }
            return { text: "The timer runs on your cube.", tone: "ok" };
        }

        function renderSync() {
            const fromTimerPage = Boolean(window.TelosConnectedTimer?.getStatus);
            const { text, tone } = (fromTimerPage || !state.activeId) && state.syncText
                ? { text: state.syncText, tone: state.syncTone }
                : fallbackSyncText();
            sync.textContent = text;
            sync.dataset.tone = tone;
            sync.classList.toggle("hidden", !text);
        }

        function capabilityNote(capabilities) {
            const unconfirmed = [
                ["rgb", "RGB"],
                ["vibration", "vibration"],
                ["sound", "sound"]
            ].filter(([key]) => capabilities?.[key] !== true).map(([, name]) => name);
            return unconfirmed.length ? `Not confirmed by firmware: ${unconfirmed.join(", ")}.` : "";
        }

        function renderControls() {
            const device = settingsDevice();
            const settings = state.settingsDeviceId === device?.id ? state.settings : null;
            controls.classList.toggle("hidden", !device || !settings);
            if (!device || !settings) return;

            controlsTitle.textContent = `${device.name || "Pomodoro Cube"} settings`;
            brightness.value = String(settings.rgbBrightness);
            brightnessValue.textContent = `${settings.rgbBrightness}%`;
            vibration.checked = Boolean(settings.vibrationEnabled);
            sound.checked = Boolean(settings.soundEnabled);
            if (!state.saveTimer) {
                const applied = settings.appliedOnDevice ? "Applied on the cube." : "Saved, waiting for the cube.";
                note.textContent = [applied, capabilityNote(settings.capabilities)].filter(Boolean).join(" ");
            }
        }

        function render() {
            renderToggle();
            renderSources();
            renderSync();
            renderControls();
        }

        // ------------------------------------------------------------ actions

        function chooseSource(value) {
            const target = value === "browser" ? null : Number(value);
            if (target === state.activeId) {
                menu.open = false;
                return;
            }
            if (window.TelosConnectedTimer?.select) {
                window.TelosConnectedTimer.select(target);
                menu.open = false;
                return;
            }
            // The handover between browser and cube happens on the timer page.
            window.location.href = `/?timerSource=${target === null ? "browser" : encodeURIComponent(target)}`;
        }

        async function loadSettings() {
            const device = settingsDevice();
            if (!device) {
                state.settings = null;
                state.settingsDeviceId = null;
                renderControls();
                return;
            }
            try {
                state.settings = await requestJson(`/api/devices/${encodeURIComponent(device.id)}/settings`);
                state.settingsDeviceId = device.id;
            } catch (error) {
                state.settings = null;
                state.settingsDeviceId = null;
            }
            renderControls();
        }

        function scheduleSave() {
            const device = settingsDevice();
            if (!device || !state.settings) return;
            brightnessValue.textContent = `${brightness.value}%`;
            note.textContent = "Saving…";
            window.clearTimeout(state.saveTimer);
            state.saveTimer = window.setTimeout(async () => {
                const payload = {
                    vibrationEnabled: vibration.checked,
                    soundEnabled: sound.checked,
                    rgbBrightness: Number(brightness.value)
                };
                try {
                    state.settings = await requestJson(`/api/devices/${encodeURIComponent(device.id)}/settings`, {
                        method: "PUT",
                        headers: csrfHeaders(),
                        body: JSON.stringify(payload)
                    });
                    state.saveTimer = null;
                } catch (error) {
                    state.saveTimer = null;
                    note.textContent = "Could not save the settings.";
                    return;
                }
                renderControls();
            }, SETTINGS_SAVE_DELAY_MS);
        }

        /** Other pages: an offline cube hands its last known phase to the browser timer. */
        function fallbackIfOffline() {
            if (window.TelosConnectedTimer?.getStatus) return; // the timer page handles it itself
            const device = activeDevice();
            if (!device || device.status === "ONLINE") return;
            const snapshot = connectedState.loadSnapshot(device.id);
            connectedState.continueInBrowser(snapshot?.state, snapshot?.offsetMs, window.PomodoroTimerState);
            state.activeId = null;
            state.syncText = "The cube went offline, so the timer continues in this browser.";
            state.syncTone = "warning";
        }

        async function loadDevices() {
            try {
                state.devices = await requestJson("/api/devices") || [];
            } catch (error) {
                return;
            }
            fallbackIfOffline();
            render();
            loadSettings();
        }

        // ------------------------------------------------------------ wiring

        brightness.addEventListener("input", scheduleSave);
        vibration.addEventListener("change", scheduleSave);
        sound.addEventListener("change", scheduleSave);

        menu.addEventListener("toggle", () => {
            if (!menu.open) return;
            // Only one header menu open at a time.
            document.querySelectorAll(".account-menu[open]").forEach((other) => {
                if (other !== menu) other.open = false;
            });
            loadDevices();
        });

        document.addEventListener("connected:status", (event) => {
            const detail = event.detail || {};
            state.activeId = detail.active ? detail.deviceId : null;
            state.syncText = detail.syncText || "";
            state.syncTone = detail.syncTone || "idle";
            state.pending = Boolean(detail.pending);
            if (Array.isArray(detail.devices) && detail.devices.length) {
                state.devices = detail.devices;
            }
            const previousSettingsDevice = state.settingsDeviceId;
            render();
            if (settingsDevice()?.id !== previousSettingsDevice) {
                loadSettings();
            }
        });

        document.addEventListener("connected:source-changed", () => {
            state.activeId = connectedState.getActiveDeviceId();
            render();
        });

        window.addEventListener("storage", (event) => {
            if (event.key === connectedState.keys.ACTIVE_DEVICE_KEY) {
                state.activeId = connectedState.getActiveDeviceId();
                render();
            }
        });

        window.TelosDeviceLive?.subscribe((message) => {
            const device = state.devices.find(item => item.id === message.deviceId);
            if (message.type === "RESYNC" || message.type === "DEVICE_ADDED" || message.type === "DEVICE_REMOVED") {
                loadDevices();
            } else if (message.type === "DEVICE_STATUS" && device) {
                device.status = message.status;
                device.lastSeenAt = message.lastSeenAt;
                if (message.status !== "ONLINE" && device.id === state.activeId && !window.TelosConnectedTimer?.getStatus) {
                    // mini-timer.js already moved the phase to the browser timer
                    state.activeId = null;
                    state.syncText = "The cube went offline, so the timer continues in this browser.";
                    state.syncTone = "warning";
                }
                render();
            } else if (message.type === "DEVICE_UPDATED" && device && message.device) {
                Object.assign(device, message.device);
                render();
            } else if (message.type === "SETTINGS" && message.settings && message.deviceId === state.settingsDeviceId
                && !state.saveTimer) {
                state.settings = message.settings;
                renderControls();
            } else if (message.type === "TIMER_STATE" && !window.TelosConnectedTimer?.getStatus) {
                // Other pages: the mini timer may switch to the cube when it is flipped.
                state.activeId = connectedState.getActiveDeviceId();
                render();
            }
        });

        loadDevices();
    });
})();
