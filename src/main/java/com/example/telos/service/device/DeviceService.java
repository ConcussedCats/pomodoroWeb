package com.example.telos.service.device;

import com.example.telos.dto.device.DeviceDtos.DeviceDto;
import com.example.telos.exception.DeviceApiException;
import com.example.telos.model.device.Device;
import com.example.telos.repository.device.DeviceRepository;
import com.example.telos.websocket.DeviceUpdatesPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/** Device management for the owning user. Another user's device is always "not found". */
@Service
public class DeviceService {
    private final DeviceRepository deviceRepository;
    private final DevicePresenceService presenceService;
    private final DeviceSettingsService settingsService;
    private final DeviceReportSanitizer sanitizer;
    private final DeviceUpdatesPublisher publisher;

    public DeviceService(DeviceRepository deviceRepository,
                         DevicePresenceService presenceService,
                         DeviceSettingsService settingsService,
                         DeviceReportSanitizer sanitizer,
                         DeviceUpdatesPublisher publisher) {
        this.deviceRepository = deviceRepository;
        this.presenceService = presenceService;
        this.settingsService = settingsService;
        this.sanitizer = sanitizer;
        this.publisher = publisher;
    }

    @Transactional(readOnly = true)
    public List<DeviceDto> list(Long userId) {
        return deviceRepository.findByUserIdOrderByCreatedAtAsc(userId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public DeviceDto get(Long userId, Long deviceId) {
        return toDto(owned(userId, deviceId));
    }

    @Transactional
    public DeviceDto rename(Long userId, Long deviceId, String name) {
        Device device = owned(userId, deviceId);
        device.setName(cleanName(name));
        DeviceDto dto = toDto(deviceRepository.save(device));
        publisher.publish(userId, "DEVICE_UPDATED", deviceId, "device", dto);
        return dto;
    }

    /** Unbinding deletes the device row; its secret, timer state, commands and settings go with it. */
    @Transactional
    public void unbind(Long userId, Long deviceId) {
        Device device = owned(userId, deviceId);
        deviceRepository.delete(device);
        publisher.publish(userId, "DEVICE_REMOVED", deviceId, null, null);
    }

    public Device owned(Long userId, Long deviceId) {
        return deviceRepository.findByDeviceIdAndUserId(deviceId, userId)
                .orElseThrow(() -> DeviceApiException.notFound("Device"));
    }

    public static String cleanName(String name) {
        String cleaned = name == null ? "" : name.replaceAll("\\p{Cntrl}", "").trim();
        if (cleaned.isEmpty()) {
            throw DeviceApiException.badRequest("INVALID_NAME", "Device name is required");
        }
        if (cleaned.length() > 40) {
            throw DeviceApiException.badRequest("INVALID_NAME", "Device name must be at most 40 characters");
        }
        return cleaned;
    }

    public DeviceDto toDto(Device device) {
        return new DeviceDto(
                device.getDeviceId(),
                device.getHardwareId(),
                device.getName(),
                presenceService.effectiveStatus(device).name(),
                device.getFirmwareVersion(),
                device.getProtocolVersion(),
                device.getLastSeenAt() == null ? null : device.getLastSeenAt().toEpochMilli(),
                device.getCreatedAt() == null ? null : device.getCreatedAt().toEpochMilli(),
                device.getLastFace() == null ? null : device.getLastFace().name(),
                sanitizer.readCapabilities(device.getCapabilities()),
                sanitizer.readMetrics(device.getMetrics()),
                Objects.equals(device.getAppliedConfigHash(), settingsService.configHash(device))
        );
    }
}
