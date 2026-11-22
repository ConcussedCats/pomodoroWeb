package com.example.telos.model.device;

import com.example.telos.model.UserTimeSettings;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class TimerModeTest {
    @Test void parsesServerAndWebNamesAndRejectsInvalidValues() {
        assertThat(TimerMode.parse("WORK")).contains(TimerMode.WORK);
        assertThat(TimerMode.parse("pomodoro")).contains(TimerMode.WORK);
        assertThat(TimerMode.parse("short-break")).contains(TimerMode.SHORT_BREAK);
        assertThat(TimerMode.parse("LONG_BREAK")).contains(TimerMode.LONG_BREAK);
        assertThat(TimerMode.parse(" work ")).isEmpty();
        assertThat(TimerMode.parse(null)).isEmpty();
    }
    @Test void usesDefaultsForNullOrInvalidSettingsAndConfiguredDurationsOtherwise() {
        UserTimeSettings settings = new UserTimeSettings();
        settings.setPomodoroMinutes(10); settings.setShortBreakMinutes(2); settings.setLongBreakMinutes(20);
        assertThat(TimerMode.WORK.durationSeconds(settings)).isEqualTo(600);
        assertThat(TimerMode.SHORT_BREAK.durationSeconds(settings)).isEqualTo(120);
        assertThat(TimerMode.LONG_BREAK.durationSeconds(settings)).isEqualTo(1200);
        assertThat(TimerMode.WORK.durationSeconds(null)).isEqualTo(1500);
        settings.setPomodoroMinutes(null);
        assertThat(TimerMode.WORK.durationSeconds(settings)).isEqualTo(1500);
    }
}
