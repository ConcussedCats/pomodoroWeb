const settingsToggle = document.getElementById("settingsToggle");
const timerSection = document.getElementById("timerSection");
const settingsSection = document.getElementById("settingsSection");
const saveSettingsBtn = document.getElementById("saveSettings");
const cancelSettingsBtn = document.getElementById("cancelSettings");
const settingsCloseBtn = document.getElementById("settingsClose");

const pomodoroInput = document.getElementById("pomodoroTime");
const shortBreakInput = document.getElementById("shortBreakTime");
const longBreakInput = document.getElementById("longBreakTime");
const soundEnabledInput = document.getElementById("soundEnabled");
const focusCyclesInput = document.getElementById("focusCycles");
const patternTypeInput = document.getElementById("patternType");
const settingsError = document.getElementById("settingsError");
const settingsSummaryFocus = document.getElementById("settingsSummaryFocus");
const settingsSummaryTotal = document.getElementById("settingsSummaryTotal");
const csrfToken = document.querySelector('meta[name="_csrf"]')?.content;
const csrfHeader = document.querySelector('meta[name="_csrf_header"]')?.content;
const isAuthenticated = window.TelosAuth?.authenticated === true
    || document.querySelector('meta[name="is-authenticated"]')?.content === "true";

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
        focusCycles: settings.pomoCycles,
        patternType: settings.patternType
    });
}

function mapLocalSettingsToApi(settings) {
    return {
        pomodoroMinutes: settings.pomodoro,
        shortBreakMinutes: settings.shortBreak,
        longBreakMinutes: settings.longBreak,
        pomoCycles: settings.focusCycles,
        soundsEnabled: settings.soundEnabled,
        patternType: settings.patternType
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
    if (patternTypeInput) {
        patternTypeInput.value = settings.patternType;
    }
    updateSettingsSummary();
}

async function parseJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch (error) {
        return {};
    }
}

function createApiError(response, data, fallbackMessage) {
    const error = new Error(data.message || fallbackMessage);
    error.status = response.status;
    return error;
}

function updateSettingsSummary() {
    if (!settingsSummaryFocus || !pomodoroInput) return;

    const focusMinutes = getSummaryNumber(pomodoroInput, savedSettings.pomodoro);
    const shortBreakMinutes = getSummaryNumber(shortBreakInput, savedSettings.shortBreak);
    const longBreakMinutes = getSummaryNumber(longBreakInput, savedSettings.longBreak);
    const focusCycles = getSummaryNumber(focusCyclesInput, savedSettings.focusCycles);
    const patternType = timerStateStore.normalizePatternType(patternTypeInput?.value || savedSettings.patternType);
    const totalMinutes = getTotalSessionMinutes(focusMinutes, shortBreakMinutes, longBreakMinutes, focusCycles, patternType);

    settingsSummaryFocus.textContent = formatDuration(focusMinutes);
    if (settingsSummaryTotal) {
        settingsSummaryTotal.textContent = formatDuration(totalMinutes);
    }
}

function getSummaryNumber(input, fallback) {
    const value = Number(String(input?.value ?? "").trim());
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getTotalSessionMinutes(focusMinutes, shortBreakMinutes, longBreakMinutes, focusCycles, patternType) {
    const workPhases = timerStateStore.getWorkPhasesPerCycle(patternType);
    const shortBreaks = workPhases - 1;

    return (
        (focusMinutes * workPhases)
        + (shortBreakMinutes * shortBreaks)
        + longBreakMinutes
    ) * focusCycles;
}

function formatDuration(totalMinutes) {
    const safeMinutes = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;

    if (hours <= 0) {
        return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
    }

    if (minutes === 0) {
        return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    }

    return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
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

    const rawDraft = {
        pomodoro: String(pomodoroInput.value ?? "").trim(),
        shortBreak: String(shortBreakInput.value ?? "").trim(),
        longBreak: String(longBreakInput.value ?? "").trim(),
        focusCycles: String(focusCyclesInput.value ?? "").trim(),
        patternType: String(patternTypeInput?.value ?? "").trim()
    };

    const draft = {
        pomodoro: Number(rawDraft.pomodoro),
        shortBreak: Number(rawDraft.shortBreak),
        longBreak: Number(rawDraft.longBreak),
        soundEnabled: soundEnabledInput.checked,
        focusCycles: Number(rawDraft.focusCycles),
        patternType: rawDraft.patternType
    };

    for (const { input, key, label, min, max } of fieldConfig) {
        const rawValue = rawDraft[key];
        const value = draft[key];

        if (!rawValue) {
            showValidationError(`${label} is required.`, [input]);
            input.focus();
            return null;
        }

        if (Number.isNaN(value)) {
            showValidationError(`${label} must be a number.`, [input]);
            input.focus();
            return null;
        }

        if (!Number.isInteger(value)) {
            showValidationError(`${label} must be a whole number.`, [input]);
            input.focus();
            return null;
        }

        if (value < min || value > max) {
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
    document.body.classList.add("settings-modal-open");
    settingsSection.classList.remove("hidden");
}

function closeSettings() {
    settingsSection.classList.add("hidden");
    document.body.classList.remove("settings-modal-open");
}

async function fetchSettingsFromApi() {
    const response = await fetch("/api/user/time-settings", {
        method: "GET",
        credentials: "same-origin",
        headers: {
            ...(csrfToken && csrfHeader ? { [csrfHeader]: csrfToken } : {})
        }
    });

    if (!response.ok) {
        const data = await parseJsonResponse(response);
        throw createApiError(response, data, "Failed to load settings from server");
    }

    const data = await parseJsonResponse(response);
    return mapApiSettingsToLocal(data);
}

async function saveSettingsToApi(settings) {
    const response = await fetch("/api/user/time-settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: getRequestHeaders(),
        body: JSON.stringify(mapLocalSettingsToApi(settings))
    });

    const data = await parseJsonResponse(response);

    if (!response.ok) {
        throw createApiError(response, data, "Failed to sync settings with server");
    }

    return mapApiSettingsToLocal(data);
}

function isAnonymousApiError(error) {
    return error.status === 401 || error.status === 403;
}

async function getSettingsForSave(validatedSettings) {
    if (!isAuthenticated) {
        return validatedSettings;
    }

    return saveSettingsToApi(validatedSettings);
}

async function saveSettings() {
    const validatedSettings = validateSettingsDraft();
    if (!validatedSettings) return;

    try {
        const nextSettings = await getSettingsForSave(validatedSettings);

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
settingsCloseBtn?.addEventListener("click", cancelSettings);

function clearInlineSettingsErrorState() {
    if (settingsError) {
        settingsError.textContent = "";
        settingsError.classList.add("hidden");
        settingsError.style.color = "";
    }
}

fieldConfig.forEach(({ input }) => {
    input.addEventListener("input", () => {
        input.removeAttribute("aria-invalid");
        input.classList.remove("settings-input--invalid");
        clearInlineSettingsErrorState();

        updateSettingsSummary();
    });
});

patternTypeInput?.addEventListener("input", () => {
    clearInlineSettingsErrorState();
    updateSettingsSummary();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && settingsSection && !settingsSection.classList.contains("hidden")) {
        cancelSettings();
    }
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
        if (isAuthenticated || !isAnonymousApiError(error)) {
            showSettingsMessage("Failed to sync timer settings from server");
        }
        document.dispatchEvent(new CustomEvent("settings:loaded", { detail: savedSettings }));
    }
}

syncSettingsOnLoad();
