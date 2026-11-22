package com.example.telos.model.device;

import com.example.telos.model.UserTimeSettings;

import java.util.Arrays;
import java.util.Optional;

/**
 * Timer mode shared by the backend, the ESP32 firmware and the browser.
 * The browser timer uses its own names ({@link #getWebMode()}), kept for compatibility with timer-state.js.
 */
public enum TimerMode {
    WORK("pomodoro"),
    SHORT_BREAK("short-break"),
    LONG_BREAK("long-break");

    private final String webMode;

    TimerMode(String webMode) {
        this.webMode = webMode;
    }

    public String getWebMode() {
        return webMode;
    }

    public boolean isBreak() {
        return this != WORK;
    }

    public static Optional<TimerMode> fromWebMode(String webMode) {
        return Arrays.stream(values()).filter(mode -> mode.webMode.equals(webMode)).findFirst();
    }

    /** Accepts both the server names (WORK) and the browser names (pomodoro). */
    public static Optional<TimerMode> parse(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        String trimmed = value.trim();
        Optional<TimerMode> byWebMode = fromWebMode(trimmed);
        if (byWebMode.isPresent()) {
            return byWebMode;
        }
        return Arrays.stream(values()).filter(mode -> mode.name().equals(trimmed)).findFirst();
    }

    public int durationSeconds(UserTimeSettings settings) {
        if (settings == null) {
            return defaultDurationSeconds();
        }
        Integer minutes = switch (this) {
            case WORK -> settings.getPomodoroMinutes();
            case SHORT_BREAK -> settings.getShortBreakMinutes();
            case LONG_BREAK -> settings.getLongBreakMinutes();
        };
        return minutes == null || minutes < 1 ? defaultDurationSeconds() : minutes * 60;
    }

    public int defaultDurationSeconds() {
        return switch (this) {
            case WORK -> 25 * 60;
            case SHORT_BREAK -> 5 * 60;
            case LONG_BREAK -> 15 * 60;
        };
    }
}
