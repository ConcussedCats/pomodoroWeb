package com.example.telos.dto.device;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/** Timer state and command payloads shared by the website and the device API. Times are epoch millis. */
public final class TimerSyncDtos {

    private TimerSyncDtos() {
    }

    /** Server view of a connected timer. remainingSeconds is the value at startedAt while RUNNING. */
    public record TimerStateDto(
            Long deviceId,
            String mode,
            String webMode,
            String status,
            int durationSeconds,
            int remainingSeconds,
            Long startedAt,
            Long pausedAt,
            Long endsAt,
            UUID sessionId,
            int cycleIndex,
            int phaseIndex,
            int totalCycles,
            int workPhasesPerCycle,
            int filledDots,
            String patternType,
            boolean sessionCompleted,
            String suggestedNextMode,
            long version,
            Long updatedAt,
            long serverTime
    ) {
    }

    /** Snapshot sent by the device (events, acks, heartbeat). Unknown fields are ignored. */
    public record TimerSnapshotPayload(
            String mode,
            String status,
            Integer durationSeconds,
            Integer remainingSeconds,
            Long startedAt,
            Long pausedAt,
            UUID sessionId,
            Integer cycleIndex,
            Integer phaseIndex,
            Long endsAt
    ) {
    }

    /** Browser phase handed over to the cube with SET_STATE. endsAt is on the server clock. */
    public record TargetStatePayload(
            String status,
            Integer durationSeconds,
            Integer remainingSeconds,
            Long endsAt,
            UUID sessionId,
            Long sessionStartedAt,
            Integer cycleIndex,
            Integer phaseIndex
    ) {
    }

    public record CreateCommandRequest(
            @NotBlank(message = "Command type is required")
            @Pattern(regexp = "START|PAUSE|RESUME|STOP|SWITCH_MODE|SET_STATE|RELEASE", message = "Unknown command type")
            String type,
            String mode,
            @Size(max = 64, message = "clientRequestId must be at most 64 characters")
            String clientRequestId,
            TargetStatePayload targetState
    ) {
    }

    public record CommandDto(
            UUID commandId,
            Long deviceId,
            String type,
            String mode,
            String status,
            String errorCode,
            Long createdAt,
            Long expiresAt,
            Long completedAt,
            Long resultingVersion
    ) {
    }
}
