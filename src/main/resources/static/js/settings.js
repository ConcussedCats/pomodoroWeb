const settingsToggle = document.getElementById("settingsToggle");
const timerSection = document.getElementById("timerSection");
const settingsSection = document.getElementById("settingsSection");
const saveSettingsBtn = document.getElementById("saveSettings");
const cancelSettingsBtn = document.getElementById("cancelSettings");

const pomodoroInput = document.getElementById("pomodoroTime");
const shortBreakInput = document.getElementById("shortBreakTime");
const longBreakInput = document.getElementById("longBreakTime");
const soundEnabledInput = document.getElementById("soundEnabled");
const focusCyclesInput = document.getElementById("focusCycles");
const settingsError = document.getElementById("settingsError");
const csrfToken = document.querySelector('meta[name="_csrf"]')?.content;
const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;
const isAuthenticated = document.querySelector('meta[name="is-authenticated"]')?.content === "true";

const timerStateStore = window.PomodoroTimerState;

const fieldConfig = [
    { input: pomodoroInput, key: "pomodoro", label: "Work", min: 1, max: 120 },
    { input: shortBreakInput, key: "shortBreak", label: "Short break", min: 1, max: 30 },
    { input: longBreakInput, key: "longBreak", label: "Long break", min: 1, max: 80 },
    { input: focusCyclesInput, key: "focusCycles", label: "Focus session cycles", min: 1, max: 12 }
];

let savedSettings = loadSettingsFromStorage();

function loadSettingsFromStorage() {
    return timerStateStore.loadSettings();
}

function mapApiSettingsToLocal(settings) {
    return timerStateStore.normalizeSettings({
        pomodoro: settings.pomodoroMinutes,
        shortBreak: settings.shortBreakMinutes,
        longBreak: settings.longBreakMinutes,
        soundEnabled: settings.soundsEnabled,
        focusCycles: settings.pomoCycles
    });
}

function mapLocalSettingsToApi(settings) {
    return {
        pomodoroMinutes: settings.pomodoro,
        shortBreakMinutes: settings.shortBreak,
        longBreakMinutes: settings.longBreak,
        pomoCycles: settings.focusCycles,
        soundsEnabled: settings.soundEnabled
    };
}

function getRequestHeaders() {
    return {
        "Content-Type": "application/json",
        ...(csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {})
    };
}

function applySettingsToInputs(settings) {
    pomodoroInput.value = settings.pomodoro;
    shortBreakInput.value = settings.shortBreak;
    longBreakInput.value = settings.longBreak;
    soundEnabledInput.checked = settings.soundEnabled;
    focusCyclesInput.value = settings.focusCycles;
}

function clearValidationState() {
    fieldConfig.forEach(({ input }) => {
        input.removeAttribute("aria-invalid");
        input.classList.remove("settings-input--invalid");
    });

    if (settingsError) {
        settingsError.textContent = "";
        settingsError.classList.add("hidden");
    }
}

function showValidationError(message, invalidInputs) {
    invalidInputs.forEach(input => {
        input.setAttribute("aria-invalid", "true");
        input.classList.add("settings-input--invalid");
    });

    if (settingsError) {
        settingsError.textContent = message;
        settingsError.classList.remove("hidden");
    }
}

function showSettingsMessage(message, isError = true) {
    if (!settingsError) return;

    settingsError.textContent = message;
    settingsError.classList.remove("hidden");
    settingsError.style.color = isError ? "" : "#8ff0b3";
}

function validateSettingsDraft() {
    clearValidationState();

    const draft = {
        pomodoro: Number(pomodoroInput.value),
        shortBreak: Number(shortBreakInput.value),
        longBreak: Number(longBreakInput.value),
        soundEnabled: soundEnabledInput.checked,
        focusCycles: Number(focusCyclesInput.value)
    };

    for (const { input, key, label, min, max } of fieldConfig) {
        const value = draft[key];
        if (!Number.isInteger(value) || value < min || value > max) {
            showValidationError(`${label} must be between ${min} and ${max}.`, [input]);
            input.focus();
            return null;
        }
    }

    return timerStateStore.normalizeSettings(draft);
}

function openSettings() {
    savedSettings = loadSettingsFromStorage();
    applySettingsToInputs(savedSettings);
    clearValidationState();
    timerSection.classList.add("hidden");
    settingsSection.classList.remove("hidden");
}

function closeSettings() {
    settingsSection.classList.add("hidden");
    timerSection.classList.remove("hidden");
}

async function fetchSettingsFromApi() {
    const response = await fetch("/api/user/time-settings", {
        method: "GET",
        headers: {
            ...(csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {})
        }
    });

    if (!response.ok) {
        throw new Error("Failed to load settings from server");
    }

    const data = await response.json();
    return mapApiSettingsToLocal(data);
}

async function saveSettingsToApi(settings) {
    const response = await fetch("/api/user/time-settings", {
        method: "PATCH",
        headers: getRequestHeaders(),
        body: JSON.stringify(mapLocalSettingsToApi(settings))
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to sync settings with server");
    }

    return mapApiSettingsToLocal(data);
}

async function saveSettings() {
    const validatedSettings = validateSettingsDraft();
    if (!validatedSettings) return;

    try {
        const nextSettings = isAuthenticated
            ? await saveSettingsToApi(validatedSettings)
            : validatedSettings;

        savedSettings = timerStateStore.saveSettings(nextSettings);
        document.dispatchEvent(new CustomEvent("settings:updated", { detail: savedSettings }));
        closeSettings();
    } catch (error) {
        showSettingsMessage(error.message || "Failed to save settings");
    }
}

function cancelSettings() {
    applySettingsToInputs(savedSettings);
    clearValidationState();
    closeSettings();
}

settingsToggle?.addEventListener("click", () => {
    if (settingsToggle.disabled) return;
    settingsSection.classList.contains("hidden") ? openSettings() : cancelSettings();
});

saveSettingsBtn?.addEventListener("click", saveSettings);
cancelSettingsBtn?.addEventListener("click", cancelSettings);

fieldConfig.forEach(({ input }) => {
    input.addEventListener("input", () => {
        input.removeAttribute("aria-invalid");
        input.classList.remove("settings-input--invalid");

        if (settingsError) {
            settingsError.textContent = "";
            settingsError.classList.add("hidden");
            settingsError.style.color = "";
        }
    });
});

window.addEventListener("storage", (event) => {
    if (event.key !== timerStateStore.keys.SETTINGS_KEY) return;

    savedSettings = loadSettingsFromStorage();
    if (!settingsSection.classList.contains("hidden")) {
        applySettingsToInputs(savedSettings);
        clearValidationState();
    }
});

async function syncSettingsOnLoad() {
    if (!isAuthenticated) {
        savedSettings = loadSettingsFromStorage();
        applySettingsToInputs(savedSettings);
        document.dispatchEvent(new CustomEvent("settings:loaded", { detail: savedSettings }));
        return;
    }

    try {
        const syncedSettings = await fetchSettingsFromApi();
        savedSettings = timerStateStore.saveSettings(syncedSettings);
        applySettingsToInputs(savedSettings);
        document.dispatchEvent(new CustomEvent("settings:loaded", { detail: savedSettings }));
        document.dispatchEvent(new CustomEvent("settings:updated", { detail: savedSettings }));
    } catch (error) {
        savedSettings = loadSettingsFromStorage();
        applySettingsToInputs(savedSettings);
        showSettingsMessage("Failed to sync timer settings from server");
        document.dispatchEvent(new CustomEvent("settings:loaded", { detail: savedSettings }));
    }
}

syncSettingsOnLoad();
