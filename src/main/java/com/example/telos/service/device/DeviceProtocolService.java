package com.example.telos.service.device;

import com.example.telos.config.DeviceProperties;
import com.example.telos.dto.device.DeviceProtocolDtos.DeviceConfigResponse;
import com.example.telos.dto.device.DeviceProtocolDtos.HeartbeatRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.HeartbeatResponse;
import com.example.telos.exception.DeviceApiException;
import com.example.telos.model.device.CubeFace;
import com.example.telos.model.device.Device;
import com.example.telos.repository.device.DeviceRepository;
import com.example.telos.security.device.DevicePrincipal;
import com.example.telos.service.device.DeviceSettingsService.DeviceConfig;
import com.example.telos.websocket.DeviceUpdatesPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Arrays;

/** Heartbeat and config download of the ESP32 (docs/esp32/PROTOCOL.md 3.2 and 3.3). */
@Service
public class DeviceProtocolService {
    private final DeviceRepository deviceRepository;
    private final DeviceTimerService timerService;
    private final DeviceSettingsService settingsService;
    private final DeviceService deviceService;
    private final DeviceReportSanitizer sanitizer;
    private final DeviceUpdatesPublisher publisher;
    private final DeviceProperties properties;
    private final Clock clock;

    public DeviceProtocolService(DeviceRepository deviceRepository,
                                 DeviceTimerService timerService,
                                 DeviceSettingsService settingsService,
                                 DeviceService deviceService,
                                 DeviceReportSanitizer sanitizer,
                                 DeviceUpdatesPublisher publisher,
                                 DeviceProperties properties,
                                 Clock clock) {
        this.deviceRepository = deviceRepository;
        this.timerService = timerService;
        this.settingsService = settingsService;
        this.deviceService = deviceService;
        this.sanitizer = sanitizer;
        this.publisher = publisher;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public HeartbeatResponse heartbeat(DevicePrincipal principal, HeartbeatRequest request) {
        // Same lock order as event ingestion and acks: timer state row first, then the devices row.
        timerService.lockForDevice(principal.deviceId(), principal.userId());
        Device device = load(principal);

        if (request.firmwareVersion() != null && !request.firmwareVersion().isBlank()) {
            device.setFirmwareVersion(request.firmwareVersion().trim());
        }
        if (request.protocolVersion() != null) {
            device.setProtocolVersion(request.protocolVersion());
        }
        if (request.capabilities() != null) {
            device.setCapabilities(sanitizer.toJson(sanitizer.capabilities(request.capabilities())));
        }
        // Metrics are replaced every time: a value the firmware stopped sending is no longer shown.
        device.setMetrics(sanitizer.toJson(sanitizer.metrics(request.metrics())));
        if (request.face() != null) {
            Arrays.stream(CubeFace.values())
                    .filter(face -> face.name().equals(request.face()))
                    .findFirst()
                    .ifPresent(device::setLastFace);
        }
        device = deviceRepository.save(device);
        settingsService.recordAppliedConfig(device, request.configHash());

        long version = timerService.syncFromHeartbeat(device, request.state());
        publisher.publish(device.getUserId(), "DEVICE_UPDATED", device.getDeviceId(), "device", deviceService.toDto(device));

        return new HeartbeatResponse(
                clock.millis(),
                timerService.pendingCommandCount(device.getDeviceId()),
                settingsService.configHash(device),
                version,
                properties.heartbeatInterval().toSeconds(),
                properties.commandPollInterval().toSeconds()
        );
    }

    @Transactional
    public DeviceConfigResponse config(DevicePrincipal principal) {
        Device device = load(principal);
        DeviceConfig config = settingsService.config(device);
        return new DeviceConfigResponse(
                config.configHash(),
                config.timer(),
                config.hardware(),
                config.faces(),
                timerService.getStateForDevice(principal)
        );
    }

    private Device load(DevicePrincipal principal) {
        return deviceRepository.findById(principal.deviceId())
                .orElseThrow(() -> DeviceApiException.notFound("Device"));
    }
}
