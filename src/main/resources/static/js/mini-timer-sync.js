document.addEventListener("DOMContentLoaded", async () => {
    const timerStateStore = window.PomodoroTimerState;
    const isAuthenticated = window.TelosAuth?.authenticated === true;

    if (!timerStateStore || !isAuthenticated) return;

    function mapApiSettingsToLocal(settings) {
        return timerStateStore.normalizeSettings({
            pomodoro: settings.pomodoroMinutes,
            shortBreak: settings.shortBreakMinutes,
            longBreak: settings.longBreakMinutes,
            soundEnabled: settings.soundsEnabled,
            focusCycles: settings.pomoCycles
        });
    }

    function areSettingsEqual(firstSettings, secondSettings) {
        const first = timerStateStore.normalizeSettings(firstSettings);
        const second = timerStateStore.normalizeSettings(secondSettings);

        return first.pomodoro === second.pomodoro
            && first.shortBreak === second.shortBreak
            && first.longBreak === second.longBreak
            && first.soundEnabled === second.soundEnabled
            && first.focusCycles === second.focusCycles;
    }

    try {
        const response = await fetch("/api/user/time-settings", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!response.ok) return;

        const data = await response.json();
        const previousSettings = timerStateStore.loadSettings();
        const nextSettings = mapApiSettingsToLocal(data);
        const settingsChanged = !areSettingsEqual(previousSettings, nextSettings);
        const syncedSettings = timerStateStore.saveSettings(nextSettings);
        const loadedState = timerStateStore.loadTimerState(syncedSettings);
        const syncedState = timerStateStore.saveTimerState(
            settingsChanged
                ? timerStateStore.applySettingsToTimerState(loadedState, syncedSettings)
                : loadedState,
            syncedSettings
        );

        if (settingsChanged) {
            document.dispatchEvent(new CustomEvent("settings:updated", { detail: syncedSettings }));
        }
        document.dispatchEvent(new CustomEvent("timer:state-updated", {
            detail: {
                settings: syncedSettings,
                state: syncedState
            }
        }));
    } catch (error) {
        console.warn("Failed to sync mini timer settings.", error);
    }
});
