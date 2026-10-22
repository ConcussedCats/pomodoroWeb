package com.example.telos.service.device;

import com.example.telos.model.device.TimerMode;
import com.example.telos.model.device.TimerStatus;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class TimerSnapshotTest {
    private static final Instant AT = Instant.parse("2026-10-20T09:00:00Z");
    @Test void validatesEveryInvalidInvariant() {
        UUID id = UUID.randomUUID();
        assertThat(new TimerSnapshot(null, TimerStatus.STOPPED, 1, 1, null, null, id).validationError()).isEqualTo("INVALID_STATE");
        assertThat(new TimerSnapshot(TimerMode.WORK, TimerStatus.STOPPED, 0, 0, null, null, id).validationError()).isEqualTo("INVALID_DURATION");
        assertThat(new TimerSnapshot(TimerMode.WORK, TimerStatus.STOPPED, 1, 2, null, null, id).validationError()).isEqualTo("INVALID_REMAINING");
        assertThat(new TimerSnapshot(TimerMode.WORK, TimerStatus.RUNNING, 1, 1, null, null, id).validationError()).isEqualTo("INVALID_STATE");
        assertThat(new TimerSnapshot(TimerMode.WORK, TimerStatus.PAUSED, 1, 1, null, AT, null).validationError()).isEqualTo("INVALID_STATE");
    }
    @Test void roundsRemainingUpAndPauseResumePreserveFrozenTime() {
        TimerSnapshot started = new TimerSnapshot(TimerMode.WORK, TimerStatus.RUNNING, 10, 10, AT, null, UUID.randomUUID());
        assertThat(started.remainingSecondsAt(AT.plusMillis(1001))).isEqualTo(9);
        assertThat(started.remainingSecondsAt(AT.plusMillis(9001))).isEqualTo(1);
        TimerSnapshot paused = started.paused(AT.plusMillis(1500));
        assertThat(paused.status()).isEqualTo(TimerStatus.PAUSED);
        assertThat(paused.remainingSeconds()).isEqualTo(9);
        assertThat(paused.resumed(AT.plusSeconds(3))).extracting(TimerSnapshot::status, TimerSnapshot::startedAt, TimerSnapshot::remainingSeconds)
                .containsExactly(TimerStatus.RUNNING, AT.plusSeconds(3), 9);
    }
}
