package com.example.telos.service.device;

import com.example.telos.model.device.CubeFace;
import com.example.telos.model.device.TimerMode;
import com.example.telos.model.device.TimerStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class CubeFacePolicyTest {
    private static final Instant NOW = Instant.parse("2026-10-20T09:00:00Z");

    @Test void modeFacesResumeStartOrDoNothingAccordingToProtocolTable() {
        TimerSnapshot paused = new TimerSnapshot(TimerMode.WORK, TimerStatus.PAUSED, 100, 50, null, NOW, java.util.UUID.randomUUID());
        assertThat(CubeFacePolicy.apply(CubeFace.WORK, paused, mode -> 100, NOW.plusSeconds(1))).get()
                .extracting(TimerSnapshot::status, TimerSnapshot::remainingSeconds).containsExactly(TimerStatus.RUNNING, 50);
        TimerSnapshot running = TimerSnapshot.started(TimerMode.WORK, 100, NOW);
        assertThat(CubeFacePolicy.apply(CubeFace.WORK, running, mode -> 100, NOW.plusSeconds(1))).isEmpty();
        assertThat(CubeFacePolicy.apply(CubeFace.SHORT_BREAK, running, mode -> 200, NOW)).get()
                .extracting(TimerSnapshot::mode, TimerSnapshot::status, TimerSnapshot::remainingSeconds)
                .containsExactly(TimerMode.SHORT_BREAK, TimerStatus.RUNNING, 200);
    }

    @Test void sameRunningModeWithExpiredCountdownStartsFreshAndPauseOnlyPausesRunning() {
        TimerSnapshot expired = new TimerSnapshot(TimerMode.WORK, TimerStatus.RUNNING, 10, 1, NOW, null, java.util.UUID.randomUUID());
        assertThat(CubeFacePolicy.apply(CubeFace.WORK, expired, mode -> 123, NOW.plusSeconds(2))).get()
                .extracting(TimerSnapshot::remainingSeconds, TimerSnapshot::status).containsExactly(123, TimerStatus.RUNNING);
        assertThat(CubeFacePolicy.apply(CubeFace.PAUSE, expired, mode -> 123, NOW.plusSeconds(1))).get()
                .extracting(TimerSnapshot::status).isEqualTo(TimerStatus.PAUSED);
        assertThat(CubeFacePolicy.apply(CubeFace.PAUSE, expired.paused(NOW), mode -> 123, NOW)).isEmpty();
    }

    @Test void displayAndTechNeverChangeStateAndTableCoversFaces() {
        TimerSnapshot state = TimerSnapshot.started(TimerMode.WORK, 100, NOW);
        assertThat(CubeFacePolicy.apply(CubeFace.DISPLAY, state, mode -> 1, NOW)).isEmpty();
        assertThat(CubeFacePolicy.apply(CubeFace.TECH, state, mode -> 1, NOW)).isEmpty();
        assertThat(CubeFacePolicy.table()).containsEntry(CubeFace.WORK, CubeFacePolicy.FaceAction.START_WORK)
                .containsEntry(CubeFace.PAUSE, CubeFacePolicy.FaceAction.PAUSE)
                .containsEntry(CubeFace.DISPLAY, CubeFacePolicy.FaceAction.NONE);
    }
}
