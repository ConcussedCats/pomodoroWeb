package com.example.telos.service.device;

import com.example.telos.model.device.DeviceTimerState;
import com.example.telos.model.device.TimerMode;
import com.example.telos.model.device.TimerStatus;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Timer state as reported by a cube (or derived on the server from a face flip).
 * While RUNNING, remainingSeconds is the value at startedAt.
 */
public record TimerSnapshot(
        TimerMode mode,
        TimerStatus status,
        int durationSeconds,
        int remainingSeconds,
        Instant startedAt,
        Instant pausedAt,
        UUID sessionId
) {
    public static final int MAX_DURATION_SECONDS = 4 * 60 * 60;

    public static TimerSnapshot of(DeviceTimerState state) {
        return new TimerSnapshot(
                state.getMode(),
                state.getStatus(),
                state.getDurationSeconds(),
                state.getRemainingSeconds(),
                state.getStartedAt(),
                state.getPausedAt(),
                state.getSessionId()
        );
    }

    public static TimerSnapshot started(TimerMode mode, int durationSeconds, Instant at) {
        return new TimerSnapshot(mode, TimerStatus.RUNNING, durationSeconds, durationSeconds, at, null, UUID.randomUUID());
    }

    public int remainingSecondsAt(Instant now) {
        if (status != TimerStatus.RUNNING || startedAt == null) {
            return Math.max(0, remainingSeconds);
        }
        long remainingMillis = remainingSeconds * 1000L - Math.max(0, now.toEpochMilli() - startedAt.toEpochMilli());
        return (int) Math.max(0, (remainingMillis + 999) / 1000);
    }

    public TimerSnapshot paused(Instant at) {
        return new TimerSnapshot(mode, TimerStatus.PAUSED, durationSeconds, remainingSecondsAt(at), null, at, sessionId);
    }

    public TimerSnapshot resumed(Instant at) {
        return new TimerSnapshot(mode, TimerStatus.RUNNING, durationSeconds, remainingSeconds, at, null, sessionId);
    }

    /** Returns an error code when the snapshot is not internally consistent, otherwise null. */
    public String validationError() {
        if (mode == null || status == null) {
            return "INVALID_STATE";
        }
        if (durationSeconds <= 0 || durationSeconds > MAX_DURATION_SECONDS) {
            return "INVALID_DURATION";
        }
        if (remainingSeconds < 0 || remainingSeconds > durationSeconds) {
            return "INVALID_REMAINING";
        }
        if (status == TimerStatus.RUNNING && (startedAt == null || sessionId == null)) {
            return "INVALID_STATE";
        }
        if (status == TimerStatus.PAUSED && sessionId == null) {
            return "INVALID_STATE";
        }
        return null;
    }

    /** Same countdown, ignoring tiny clock jitter between device and server. */
    public boolean sameAs(TimerSnapshot other) {
        return other != null
                && mode == other.mode
                && status == other.status
                && durationSeconds == other.durationSeconds
                && remainingSeconds == other.remainingSeconds
                && Objects.equals(sessionId, other.sessionId)
                && Objects.equals(startedAt, other.startedAt);
    }
}
