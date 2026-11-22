package com.example.telos.dto.device;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

/** Payloads of the user-facing device management, pairing and device settings API. Times are epoch millis. */
public final class DeviceDtos {

    private DeviceDtos() {
    }

    public record DeviceDto(
            Long id,
            String hardwareId,
            String name,
            String status,
            String firmwareVersion,
            Integer protocolVersion,
            Long lastSeenAt,
            Long createdAt,
            String lastFace,
            Map<String, Boolean> capabilities,
            Map<String, Number> metrics,
            boolean settingsApplied
    ) {
    }

    public record RenameDeviceRequest(
            @NotBlank(message = "Device name is required")
            @Size(max = 40, message = "Device name must be at most 40 characters")
            String name
    ) {
    }

    public record PairingCreatedDto(
            Long pairingId,
            String pairingToken,
            String status,
            Long expiresAt
    ) {
    }

    public record PairingStatusDto(
            Long pairingId,
            String status,
            Long expiresAt,
            Long deviceId,
            String deviceName
    ) {
    }

    public record DeviceSettingsDto(
            Long deviceId,
            boolean vibrationEnabled,
            boolean soundEnabled,
            int rgbBrightness,
            Long updatedAt,
            boolean appliedOnDevice,
            Map<String, Boolean> capabilities
    ) {
    }

    public record UpdateDeviceSettingsRequest(
            @NotNull(message = "vibrationEnabled is required")
            Boolean vibrationEnabled,
            @NotNull(message = "soundEnabled is required")
            Boolean soundEnabled,
            @NotNull(message = "rgbBrightness is required")
            @Min(value = 0, message = "rgbBrightness must be between 0 and 100")
            @Max(value = 100, message = "rgbBrightness must be between 0 and 100")
            Integer rgbBrightness
    ) {
    }
}
