import assert from "node:assert/strict";
import test from "node:test";

import {
    createDocument,
    createElement,
    runBrowserScript
} from "./dom-test-utils.mjs";

function bootstrapSettingsPage() {
    const settingsToggle = createElement({ tagName: "button", id: "settingsToggle" });
    const timerSection = createElement({ id: "timerSection" });
    const settingsSection = createElement({ id: "settingsSection", classNames: ["hidden"] });
    const saveSettings = createElement({ tagName: "button", id: "saveSettings" });
    const cancelSettings = createElement({ tagName: "button", id: "cancelSettings" });
    const pomodoroTime = createElement({ tagName: "input", id: "pomodoroTime", value: "25" });
    const shortBreakTime = createElement({ tagName: "input", id: "shortBreakTime", value: "5" });
    const longBreakTime = createElement({ tagName: "input", id: "longBreakTime", value: "15" });
    const soundEnabled = createElement({ tagName: "input", id: "soundEnabled" });
    const focusCycles = createElement({ tagName: "input", id: "focusCycles", value: "1" });
    const patternType = createElement({ tagName: "select", id: "patternType", value: "classic" });
    const settingsError = createElement({ tagName: "p", id: "settingsError", classNames: ["hidden"] });
    const settingsClose = createElement({ tagName: "button", id: "settingsClose" });
    const settingsSummaryFocus = createElement({ tagName: "span", id: "settingsSummaryFocus" });
    const settingsSummaryTotal = createElement({ tagName: "span", id: "settingsSummaryTotal" });
    const authMeta = createElement({ tagName: "meta", attributes: { name: "is-authenticated", content: "false" } });

    settingsSection.appendChild(pomodoroTime);
    settingsSection.appendChild(shortBreakTime);
    settingsSection.appendChild(longBreakTime);
    settingsSection.appendChild(soundEnabled);
    settingsSection.appendChild(focusCycles);
    settingsSection.appendChild(patternType);
    settingsSection.appendChild(settingsError);
    settingsSection.appendChild(settingsClose);
    settingsSection.appendChild(settingsSummaryFocus);
    settingsSection.appendChild(settingsSummaryTotal);
    settingsSection.appendChild(saveSettings);
    settingsSection.appendChild(cancelSettings);

    const document = createDocument([
        authMeta,
        settingsToggle,
        timerSection,
        settingsSection,
        saveSettings,
        cancelSettings,
        pomodoroTime,
        shortBreakTime,
        longBreakTime,
        soundEnabled,
        focusCycles,
        patternType,
        settingsError
    ]);

    let savedSettings = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        soundEnabled: true,
        focusCycles: 1,
        patternType: "classic"
    };
    let saveCalls = [];

    const context = {
        document,
        window: null,
        fetch: async () => {
            throw new Error("fetch should not be called for anonymous settings tests");
        },
        CustomEvent: class CustomEvent {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        },
        PomodoroTimerState: {
            keys: {
                SETTINGS_KEY: "pomodoroSettings"
            },
            loadSettings() {
                return { ...savedSettings };
            },
            normalizeSettings(nextValue) {
                return {
                    pomodoro: Number(nextValue.pomodoro),
                    shortBreak: Number(nextValue.shortBreak),
                    longBreak: Number(nextValue.longBreak),
                    soundEnabled: Boolean(nextValue.soundEnabled),
                    focusCycles: Number(nextValue.focusCycles),
                    patternType: nextValue.patternType || "classic"
                };
            },
            normalizePatternType(value) {
                return value === "compact" ? "compact" : "classic";
            },
            getWorkPhasesPerCycle(patternTypeValue) {
                return patternTypeValue === "compact" ? 2 : 4;
            },
            saveSettings(nextValue) {
                savedSettings = { ...nextValue };
                saveCalls.push({ ...nextValue });
                return { ...savedSettings };
            }
        },
        JSON,
        Date,
        Math,
        Number,
        String,
        Boolean,
        Object,
        Array,
        console: {
            warn() {},
            log() {},
            error() {}
        },
        addEventListener() {}
    };
    context.window = context;

    runBrowserScript("src/main/resources/static/js/settings.js", context);

    return {
        settingsToggle,
        timerSection,
        settingsSection,
        saveSettings,
        pomodoroTime,
        shortBreakTime,
        longBreakTime,
        focusCycles,
        patternType,
        settingsError,
        getSaveCalls() {
            return saveCalls;
        }
    };
}

test("[ui-negative] settings validation rejects non-numeric values and keeps state unsaved", () => {
    const runtime = bootstrapSettingsPage();

    runtime.pomodoroTime.value = "abc";
    runtime.saveSettings.dispatchEvent({ type: "click", target: runtime.saveSettings });

    assert.equal(runtime.settingsError.classList.contains("hidden"), false);
    assert.equal(runtime.settingsError.textContent, "Work must be a number.");
    assert.equal(runtime.pomodoroTime.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.getSaveCalls().length, 0);
});

test("[ui-negative] settings validation rejects decimal values and keeps state unsaved", () => {
    const runtime = bootstrapSettingsPage();

    runtime.shortBreakTime.value = "2.5";
    runtime.saveSettings.dispatchEvent({ type: "click", target: runtime.saveSettings });

    assert.equal(runtime.settingsError.textContent, "Short break must be a whole number.");
    assert.equal(runtime.shortBreakTime.getAttribute("aria-invalid"), "true");
    assert.equal(runtime.getSaveCalls().length, 0);
});

test("[ui-negative] settings validation rejects empty and out-of-range values with field-specific messages", () => {
    const runtime = bootstrapSettingsPage();

    runtime.longBreakTime.value = "";
    runtime.saveSettings.dispatchEvent({ type: "click", target: runtime.saveSettings });
    assert.equal(runtime.settingsError.textContent, "Long break is required.");
    assert.equal(runtime.getSaveCalls().length, 0);

    runtime.longBreakTime.value = "90";
    runtime.longBreakTime.dispatchEvent({ type: "input", target: runtime.longBreakTime });
    runtime.saveSettings.dispatchEvent({ type: "click", target: runtime.saveSettings });
    assert.equal(runtime.settingsError.textContent, "Long break must be between 1 and 80.");
    assert.equal(runtime.getSaveCalls().length, 0);
});

test("[ui-negative] corrected settings clear the error state and persist only after a valid save", async () => {
    const runtime = bootstrapSettingsPage();

    runtime.focusCycles.value = "0";
    runtime.saveSettings.dispatchEvent({ type: "click", target: runtime.saveSettings });
    assert.equal(runtime.settingsError.textContent, "Focus session cycles must be between 1 and 12.");
    assert.equal(runtime.getSaveCalls().length, 0);

    runtime.focusCycles.value = "3";
    runtime.focusCycles.dispatchEvent({ type: "input", target: runtime.focusCycles });
    assert.equal(runtime.settingsError.classList.contains("hidden"), true);

    runtime.saveSettings.dispatchEvent({ type: "click", target: runtime.saveSettings });
    await Promise.resolve();
    assert.equal(runtime.getSaveCalls().length, 1);
    assert.deepEqual(runtime.getSaveCalls()[0], {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        soundEnabled: true,
        focusCycles: 3,
        patternType: "classic"
    });
});
