package com.example.telos.dto.device;

import com.example.telos.dto.device.TimerSyncDtos.TimerSnapshotPayload;
import com.example.telos.dto.device.TimerSyncDtos.TimerStateDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Payloads of the ESP32-facing API, see docs/esp32/PROTOCOL.md. Times are epoch millis. */
public final class DeviceProtocolDtos {

    public static final String HARDWARE_ID_REGEX = "^[A-Za-z0-9:_-]{4,64}$";

    private DeviceProtocolDtos() {
    }

    public record PairRequest(
            @NotBlank(message = "pairingToken is required")
            @Size(max = 128, message = "pairingToken is too long")
            String pairingToken,
            @NotBlank(message = "hardwareId is required")
            @Pattern(regexp = HARDWARE_ID_REGEX, message = "hardwareId must be 4-64 characters: letters, digits, ':', '_' or '-'")
            String hardwareId,
            @Size(max = 32, message = "firmwareVersion is too long")
            String firmwareVersion,
            Integer protocolVersion,
            @Size(max = 40, message = "name is too long")
            String name,
            Map<String, Object> capabilities
    ) {
    }

    public record PairResponse(
            Long deviceId,
            String deviceSecret,
            long serverTime,
            long heartbeatIntervalSeconds,
            long commandPollIntervalSeconds
    ) {
    }

    public record HeartbeatRequest(
            @Size(max = 32, message = "firmwareVersion is too long")
            String firmwareVersion,
            Integer protocolVersion,
            Map<String, Object> capabilities,
            Map<String, Object> metrics,
            String face,
            String configHash,
            TimerSnapshotPayload state
    ) {
    }

    public record HeartbeatResponse(
            long serverTime,
            long pendingCommands,
            String configHash,
            long timerStateVersion,
            long heartbeatIntervalSeconds,
            long commandPollIntervalSeconds
    ) {
    }

    public record DeviceEventPayload(
            @NotNull(message = "eventId is required")
            UUID eventId,
            Long seq,
            @NotBlank(message = "type is required")
            String type,
            String face,
            Long occurredAt,
            TimerSnapshotPayload state
    ) {
    }

    public record DeviceEventBatchRequest(
            @Size(max = 36, message = "bootId is too long")
            String bootId,
            @NotEmpty(message = "events must not be empty")
            @Size(max = 100, message = "at most 100 events per request")
            List<@Valid DeviceEventPayload> events
    ) {
    }

    public record DeviceEventResultDto(UUID eventId, String result, String errorCode) {
    }

    public record DeviceEventBatchResponse(List<DeviceEventResultDto> results, TimerStateDto state) {
    }

    public record DeviceCommandPayload(UUID commandId, String type, String mode, long createdAt, long expiresAt) {
    }

    public record DeviceCommandsResponse(List<DeviceCommandPayload> commands) {
    }

    public record CommandAckRequest(
            @NotBlank(message = "result is required")
            @Pattern(regexp = "EXECUTED|REJECTED", message = "result must be EXECUTED or REJECTED")
            String result,
            @Size(max = 64, message = "errorCode is too long")
            String errorCode,
            TimerSnapshotPayload state
    ) {
    }

    public record CommandAckResponse(UUID commandId, String status, TimerStateDto state) {
    }

    public record TimerConfig(int pomodoroMinutes, int shortBreakMinutes, int longBreakMinutes, int pomoCycles, String patternType) {
    }

    public record HardwareConfig(boolean vibrationEnabled, boolean soundEnabled, int rgbBrightness) {
    }

    public record DeviceConfigResponse(
            String configHash,
            TimerConfig timer,
            HardwareConfig hardware,
            Map<String, String> faces,
            TimerStateDto state
    ) {
    }
}
