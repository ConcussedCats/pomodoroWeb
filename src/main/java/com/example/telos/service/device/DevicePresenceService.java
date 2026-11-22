package com.example.telos.service.device;

import com.example.telos.config.DeviceProperties;
import com.example.telos.model.device.Device;
import com.example.telos.model.device.DeviceConnectionStatus;
import com.example.telos.repository.device.DeviceRepository;
import com.example.telos.security.device.DevicePrincipal;
import com.example.telos.security.device.DeviceSecrets;
import com.example.telos.websocket.DeviceUpdatesPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Device authentication and ONLINE / OFFLINE tracking. */
@Service
public class DevicePresenceService {
    /** Avoid a database write on every 3 second command poll. */
    private static final Duration SEEN_WRITE_THROTTLE = Duration.ofSeconds(10);

    private final DeviceRepository deviceRepository;
    private final DeviceUpdatesPublisher publisher;
    private final DeviceProperties properties;
    private final Clock clock;

    public DevicePresenceService(DeviceRepository deviceRepository,
                                 DeviceUpdatesPublisher publisher,
                                 DeviceProperties properties,
                                 Clock clock) {
        this.deviceRepository = deviceRepository;
        this.publisher = publisher;
        this.properties = properties;
        this.clock = clock;
    }

    /** Checks the device secret and records that the device was seen. */
    @Transactional
    public Optional<DevicePrincipal> authenticate(String hardwareId, String secret) {
        if (hardwareId.length() > 64 || secret == null || secret.isEmpty() || secret.length() > 128) {
            return Optional.empty();
        }
        Optional<Device> device = deviceRepository.findByHardwareId(hardwareId)
                .filter(candidate -> DeviceSecrets.matches(secret, candidate.getDeviceSecretHash()));
        device.ifPresent(this::markSeen);
        return device.map(found -> new DevicePrincipal(found.getDeviceId(), found.getUserId(), found.getHardwareId()));
    }

    @Transactional
    public void markSeen(Device device) {
        Instant now = clock.instant();
        boolean wasOffline = device.getStatus() != DeviceConnectionStatus.ONLINE;
        boolean stale = device.getLastSeenAt() == null
                || device.getLastSeenAt().plus(SEEN_WRITE_THROTTLE).isBefore(now);
        if (!wasOffline && !stale) {
            return;
        }
        device.setLastSeenAt(now);
        device.setStatus(DeviceConnectionStatus.ONLINE);
        deviceRepository.save(device);
        if (wasOffline) {
            publishStatus(device);
        }
    }

    /** Marks devices OFFLINE when nothing arrived from them for offlineAfter. */
    @Transactional
    public int markSilentDevicesOffline() {
        Instant threshold = clock.instant().minus(properties.offlineAfter());
        List<Device> silent = deviceRepository.findByStatusAndLastSeenAtBefore(DeviceConnectionStatus.ONLINE, threshold);
        for (Device device : silent) {
            device.setStatus(DeviceConnectionStatus.OFFLINE);
            deviceRepository.save(device);
            publishStatus(device);
        }
        return silent.size();
    }

    /** Status as the website should see it, even if the offline sweep has not run yet. */
    public DeviceConnectionStatus effectiveStatus(Device device) {
        if (device.getStatus() != DeviceConnectionStatus.ONLINE || device.getLastSeenAt() == null) {
            return DeviceConnectionStatus.OFFLINE;
        }
        Instant threshold = clock.instant().minus(properties.offlineAfter());
        return device.getLastSeenAt().isBefore(threshold) ? DeviceConnectionStatus.OFFLINE : DeviceConnectionStatus.ONLINE;
    }

    private void publishStatus(Device device) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", device.getStatus().name());
        payload.put("lastSeenAt", device.getLastSeenAt() == null ? null : device.getLastSeenAt().toEpochMilli());
        publisher.publish(device.getUserId(), "DEVICE_STATUS", device.getDeviceId(), payload);
    }
}
