package com.example.telos.model.device;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.UUID;

/**
 * Authoritative synchronized timer state of a connected cube.
 * While RUNNING, remainingSeconds is the value at startedAt, so the countdown ends at startedAt + remainingSeconds.
 */
@Getter
@Setter
@NoArgsConstructor
@ToString
@Entity
@Table(name = "device_timer_states")
public class DeviceTimerState {

    @Id
    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 16)
    private TimerMode mode = TimerMode.WORK;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private TimerStatus status = TimerStatus.STOPPED;

    @Column(name = "remaining_seconds", nullable = false)
    private Integer remainingSeconds;

    @Column(name = "duration_seconds", nullable = false)
    private Integer durationSeconds;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "paused_at")
    private Instant pausedAt;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "cycle_index", nullable = false)
    private Integer cycleIndex = 0;

    @Column(name = "phase_index", nullable = false)
    private Integer phaseIndex = 0;

    @Column(name = "last_boot_id", length = 36)
    private String lastBootId;

    @Column(name = "last_event_seq")
    private Long lastEventSeq;

    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static DeviceTimerState initial(Long deviceId, int workDurationSeconds, Instant now) {
        DeviceTimerState state = new DeviceTimerState();
        state.setDeviceId(deviceId);
        state.setDurationSeconds(workDurationSeconds);
        state.setRemainingSeconds(workDurationSeconds);
        state.setUpdatedAt(now);
        return state;
    }

    /** Remaining seconds at the given moment, computed locally instead of being synced every second. */
    public int remainingSecondsAt(Instant now) {
        if (status != TimerStatus.RUNNING || startedAt == null) {
            return Math.max(0, remainingSeconds);
        }
        long elapsedMillis = Math.max(0, now.toEpochMilli() - startedAt.toEpochMilli());
        long remainingMillis = remainingSeconds * 1000L - elapsedMillis;
        return (int) Math.max(0, (remainingMillis + 999) / 1000);
    }
}
