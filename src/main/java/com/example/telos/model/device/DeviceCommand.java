package com.example.telos.model.device;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@ToString
@Entity
@Table(name = "device_commands")
public class DeviceCommand {

    @Id
    @Column(name = "command_id", nullable = false)
    private UUID commandId;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "command_type", nullable = false, length = 16)
    private DeviceCommandType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_mode", length = 16)
    private TimerMode targetMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private DeviceCommandStatus status = DeviceCommandStatus.PENDING;

    @Column(name = "client_request_id", length = 64)
    private String clientRequestId;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    @Column(name = "resulting_version")
    private Long resultingVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    // ---- SET_STATE only: the phase the cube must continue

    @Enumerated(EnumType.STRING)
    @Column(name = "target_status", length = 16)
    private TimerStatus targetStatus;

    @Column(name = "target_duration_seconds")
    private Integer targetDurationSeconds;

    @Column(name = "target_remaining_seconds")
    private Integer targetRemainingSeconds;

    @Column(name = "target_ends_at")
    private Instant targetEndsAt;

    @Column(name = "target_session_id")
    private UUID targetSessionId;

    @Column(name = "target_session_started_at")
    private Instant targetSessionStartedAt;

    @Column(name = "target_cycle_index")
    private Integer targetCycleIndex;

    @Column(name = "target_phase_index")
    private Integer targetPhaseIndex;
}
