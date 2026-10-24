package com.example.telos.service.device;

import com.example.telos.model.device.TimerMode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TimerPhasePlannerTest {
    @Test void classicPatternTransitionsAndDotsMatchBrowserContract() {
        TimerPhasePlanner planner = new TimerPhasePlanner("classic", 2);
        assertThat(planner.workPhasesPerCycle()).isEqualTo(4);
        assertThat(planner.modeAt(new TimerPhasePlanner.Position(0, 0))).isEqualTo(TimerMode.WORK);
        assertThat(planner.next(new TimerPhasePlanner.Position(0, 7))).contains(new TimerPhasePlanner.Position(1, 0));
        assertThat(planner.filledDots(new TimerPhasePlanner.Position(0, 0))).isEqualTo(1);
        assertThat(planner.filledDots(new TimerPhasePlanner.Position(0, 4))).isEqualTo(3);
        assertThat(planner.filledDots(new TimerPhasePlanner.Position(0, 7))).isEqualTo(4);
    }

    @Test void compactPatternAndManualOverrideSkipRuleMatchBrowserContract() {
        TimerPhasePlanner planner = new TimerPhasePlanner("compact", 1);
        assertThat(planner.workPhasesPerCycle()).isEqualTo(2);
        assertThat(planner.afterCompletion(new TimerPhasePlanner.Position(0, 0), TimerMode.WORK))
                .isEqualTo(new TimerPhasePlanner.Position(0, 1));
        // A manual work completion while positioned on the short break skips the next work phase.
        assertThat(planner.afterCompletion(new TimerPhasePlanner.Position(0, 1), TimerMode.WORK))
                .isEqualTo(new TimerPhasePlanner.Position(0, 3));
        // A manual break completion while positioned on the first work phase skips the following break.
        assertThat(planner.afterCompletion(new TimerPhasePlanner.Position(0, 0), TimerMode.LONG_BREAK))
                .isEqualTo(new TimerPhasePlanner.Position(0, 2));
        assertThat(planner.afterCompletion(new TimerPhasePlanner.Position(0, 3), TimerMode.LONG_BREAK))
                .isEqualTo(new TimerPhasePlanner.Position(1, 0));
        assertThat(planner.isCompleted(new TimerPhasePlanner.Position(1, 0))).isTrue();
        assertThat(planner.onStart(new TimerPhasePlanner.Position(1, 0))).isEqualTo(TimerPhasePlanner.Position.START);
    }

    @Test void normalizesUnknownPatternAndOutOfRangePositions() {
        TimerPhasePlanner planner = new TimerPhasePlanner("unexpected", 99);
        assertThat(planner.patternType()).isEqualTo("classic");
        assertThat(planner.totalCycles()).isEqualTo(12);
        assertThat(planner.normalize(-4, 99)).isEqualTo(new TimerPhasePlanner.Position(0, 7));
        assertThat(planner.normalize(99, -2)).isEqualTo(new TimerPhasePlanner.Position(12, 0));
    }
}
