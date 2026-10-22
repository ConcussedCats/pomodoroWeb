package com.example.telos.service.device;

import com.example.telos.dto.device.DeviceDtos.DeviceSettingsDto;
import com.example.telos.dto.device.DeviceDtos.UpdateDeviceSettingsRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.HardwareConfig;
import com.example.telos.dto.device.DeviceProtocolDtos.TimerConfig;
import com.example.telos.exception.DeviceApiException;
import com.example.telos.model.UserTimeSettings;
import com.example.telos.model.device.CubeFace;
import com.example.telos.model.device.Device;
import com.example.telos.model.device.DeviceSettings;
import com.example.telos.model.device.TimerMode;
import com.example.telos.repository.UserTimeSettingsRepository;
import com.example.telos.repository.device.DeviceRepository;
import com.example.telos.repository.device.DeviceSettingsRepository;
import com.example.telos.security.device.DeviceSecrets;
import com.example.telos.websocket.DeviceUpdatesPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

/**
 * Hardware settings of a cube (DeviceSettings) combined with the owner's existing timer settings
 * (UserTimeSettings) into the config the firmware downloads. Timer durations are not duplicated per device.
 */
@Service
public class DeviceSettingsService {
    private final DeviceSettingsRepository settingsRepository;
    private final DeviceRepository deviceRepository;
    private final UserTimeSettingsRepository timeSettingsRepository;
    private final DeviceReportSanitizer sanitizer;
    private final DeviceUpdatesPublisher publisher;
    private final Clock clock;

    public DeviceSettingsService(DeviceSettingsRepository settingsRepository,
                                 DeviceRepository deviceRepository,
                                 UserTimeSettingsRepository timeSettingsRepository,
                                 DeviceReportSanitizer sanitizer,
                                 DeviceUpdatesPublisher publisher,
                                 Clock clock) {
        this.settingsRepository = settingsRepository;
        this.deviceRepository = deviceRepository;
        this.timeSettingsRepository = timeSettingsRepository;
        this.sanitizer = sanitizer;
        this.publisher = publisher;
        this.clock = clock;
    }

    public record DeviceConfig(TimerConfig timer, HardwareConfig hardware, Map<String, String> faces, String configHash) {
    }

    @Transactional(readOnly = true)
    public DeviceSettingsDto get(Long userId, Long deviceId) {
        Device device = owned(userId, deviceId);
        return toDto(device, settingsOf(device.getDeviceId()));
    }

    @Transactional
    public DeviceSettingsDto update(Long userId, Long deviceId, UpdateDeviceSettingsRequest request) {
        Device device = owned(userId, deviceId);
        DeviceSettings settings = settingsOf(deviceId);
        settings.setVibrationEnabled(request.vibrationEnabled());
        settings.setSoundEnabled(request.soundEnabled());
        settings.setRgbBrightness(request.rgbBrightness());
        settings.setUpdatedAt(clock.instant());
        settingsRepository.save(settings);

        DeviceSettingsDto dto = toDto(device, settings);
        publisher.publish(userId, "SETTINGS", deviceId, "settings", dto);
        return dto;
    }

    @Transactional
    public DeviceSettings ensureDefaults(Long deviceId) {
        return settingsRepository.findById(deviceId)
                .orElseGet(() -> settingsRepository.save(DeviceSettings.defaultsFor(deviceId, clock.instant())));
    }

    /** Full config for the firmware; changes whenever the device or the owner's timer settings change. */
    @Transactional(readOnly = true)
    public DeviceConfig config(Device device) {
        UserTimeSettings timeSettings = timeSettingsRepository.findByUser_UserId(device.getUserId()).orElse(null);
        DeviceSettings settings = settingsOf(device.getDeviceId());

        TimerConfig timer = new TimerConfig(
                TimerMode.WORK.durationSeconds(timeSettings) / 60,
                TimerMode.SHORT_BREAK.durationSeconds(timeSettings) / 60,
                TimerMode.LONG_BREAK.durationSeconds(timeSettings) / 60,
                timeSettings == null || timeSettings.getPomoCycles() == null ? 4 : timeSettings.getPomoCycles(),
                timeSettings == null || timeSettings.getPatternType() == null ? TimerPhasePlanner.CLASSIC : timeSettings.getPatternType()
        );
        HardwareConfig hardware = new HardwareConfig(
                Boolean.TRUE.equals(settings.getVibrationEnabled()),
                Boolean.TRUE.equals(settings.getSoundEnabled()),
                settings.getRgbBrightness()
        );
        Map<String, String> faces = new TreeMap<>();
        CubeFacePolicy.table().forEach((face, action) -> faces.put(face.name(), action.name()));

        return new DeviceConfig(timer, hardware, faces, hash(timer, hardware, faces));
    }

    @Transactional(readOnly = true)
    public String configHash(Device device) {
        return config(device).configHash();
    }

    @Transactional
    public void recordAppliedConfig(Device device, String reportedHash) {
        if (reportedHash == null || reportedHash.length() > 64 || Objects.equals(reportedHash, device.getAppliedConfigHash())) {
            return;
        }
        device.setAppliedConfigHash(reportedHash);
        deviceRepository.save(device);
        if (reportedHash.equals(configHash(device))) {
            publisher.publish(device.getUserId(), "SETTINGS", device.getDeviceId(), "settings",
                    toDto(device, settingsOf(device.getDeviceId())));
        }
    }

    private String hash(TimerConfig timer, HardwareConfig hardware, Map<String, String> faces) {
        String canonical = timer + "|" + hardware + "|" + faces + "|" + CubeFace.values().length;
        return DeviceSecrets.sha256Hex(canonical).substring(0, 16);
    }

    private DeviceSettings settingsOf(Long deviceId) {
        return settingsRepository.findById(deviceId)
                .orElseGet(() -> DeviceSettings.defaultsFor(deviceId, clock.instant()));
    }

    private Device owned(Long userId, Long deviceId) {
        return deviceRepository.findByDeviceIdAndUserId(deviceId, userId)
                .orElseThrow(() -> DeviceApiException.notFound("Device"));
    }

    private DeviceSettingsDto toDto(Device device, DeviceSettings settings) {
        return new DeviceSettingsDto(
                device.getDeviceId(),
                Boolean.TRUE.equals(settings.getVibrationEnabled()),
                Boolean.TRUE.equals(settings.getSoundEnabled()),
                settings.getRgbBrightness(),
                settings.getUpdatedAt() == null ? null : settings.getUpdatedAt().toEpochMilli(),
                Objects.equals(device.getAppliedConfigHash(), configHash(device)),
                sanitizer.readCapabilities(device.getCapabilities())
        );
    }
}
