document.addEventListener("DOMContentLoaded", async () => {
    const timerStateStore = window.PomodoroTimerState;

    if (!timerStateStore) return;

    function mapApiSettingsToLocal(settings) {
        return timerStateStore.normalizeSettings({
            pomodoro: settings.pomodoroMinutes,
            shortBreak: settings.shortBreakMinutes,
            longBreak: settings.longBreakMinutes,
            soundEnabled: settings.soundsEnabled,
            focusCycles: settings.pomoCycles
        });
    }

    try {
        const response = await fetch("/api/user/time-settings", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!response.ok) return;

        const data = await response.json();
        const syncedSettings = timerStateStore.saveSettings(mapApiSettingsToLocal(data));
        const syncedState = timerStateStore.saveTimerState(
            timerStateStore.applySettingsToTimerState(
                timerStateStore.loadTimerState(syncedSettings),
                syncedSettings
            ),
            syncedSettings
        );

        document.dispatchEvent(new CustomEvent("settings:updated", { detail: syncedSettings }));
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
