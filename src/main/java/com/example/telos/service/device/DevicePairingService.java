package com.example.telos.service.device;

import com.example.telos.config.DeviceProperties;
import com.example.telos.dto.device.DeviceDtos.PairingCreatedDto;
import com.example.telos.dto.device.DeviceDtos.PairingStatusDto;
import com.example.telos.dto.device.DeviceProtocolDtos.PairRequest;
import com.example.telos.dto.device.DeviceProtocolDtos.PairResponse;
import com.example.telos.exception.DeviceApiException;
import com.example.telos.model.device.Device;
import com.example.telos.model.device.DeviceConnectionStatus;
import com.example.telos.model.device.DevicePairing;
import com.example.telos.model.device.PairingStatus;
import com.example.telos.repository.device.DevicePairingRepository;
import com.example.telos.repository.device.DeviceRepository;
import com.example.telos.security.device.DeviceSecrets;
import com.example.telos.websocket.DeviceUpdatesPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

/**
 * One-time pairing: the website creates a short-lived token, the cube receives it over BLE and
 * exchanges it for its own device secret. Only hashes of the token and the secret are stored.
 */
@Service
public class DevicePairingService {
    public static final String DEFAULT_DEVICE_NAME = "Pomodoro Cube";

    private final DevicePairingRepository pairingRepository;
    private final DeviceRepository deviceRepository;
    private final DeviceSettingsService settingsService;
    private final DeviceService deviceService;
    private final DeviceTimerService timerService;
    private final DeviceReportSanitizer sanitizer;
    private final DeviceUpdatesPublisher publisher;
    private final DeviceProperties properties;
    private final Clock clock;

    public DevicePairingService(DevicePairingRepository pairingRepository,
                                DeviceRepository deviceRepository,
                                DeviceSettingsService settingsService,
                                DeviceService deviceService,
                                DeviceTimerService timerService,
                                DeviceReportSanitizer sanitizer,
                                DeviceUpdatesPublisher publisher,
                                DeviceProperties properties,
                                Clock clock) {
        this.pairingRepository = pairingRepository;
        this.deviceRepository = deviceRepository;
        this.settingsService = settingsService;
        this.deviceService = deviceService;
        this.timerService = timerService;
        this.sanitizer = sanitizer;
        this.publisher = publisher;
        this.properties = properties;
        this.clock = clock;
    }

    /** Opens a new pairing session; any previous open session of the user stops being valid. */
    @Transactional
    public PairingCreatedDto create(Long userId) {
        pairingRepository.expireOpenPairingsOfUser(userId);

        Instant now = clock.instant();
        String token = DeviceSecrets.newToken();
        DevicePairing pairing = new DevicePairing();
        pairing.setUserId(userId);
        pairing.setPairingTokenHash(DeviceSecrets.sha256Hex(token));
        pairing.setStatus(PairingStatus.CREATED);
        pairing.setCreatedAt(now);
        pairing.setExpiresAt(now.plus(properties.pairingTtl()));
        pairingRepository.save(pairing);

        return new PairingCreatedDto(pairing.getPairingId(), token, pairing.getStatus().name(), pairing.getExpiresAt().toEpochMilli());
    }

    @Transactional
    public PairingStatusDto status(Long userId, Long pairingId) {
        DevicePairing pairing = pairingRepository.findByPairingIdAndUserId(pairingId, userId)
                .orElseThrow(() -> DeviceApiException.notFound("Pairing"));
        if (pairing.getStatus() == PairingStatus.CREATED && pairing.isExpiredAt(clock.instant())) {
            pairing.setStatus(PairingStatus.EXPIRED);
            pairingRepository.save(pairing);
        }

        Optional<Device> device = Optional.ofNullable(pairing.getClaimedDeviceId())
                .flatMap(deviceRepository::findById);
        return new PairingStatusDto(
                pairing.getPairingId(),
                pairing.getStatus().name(),
                pairing.getExpiresAt().toEpochMilli(),
                device.map(Device::getDeviceId).orElse(null),
                device.map(Device::getName).orElse(null)
        );
    }

    /** Called by the cube (unauthenticated) with the token it received over BLE. */
    @Transactional(noRollbackFor = DeviceApiException.class)
    public PairResponse claim(PairRequest request) {
        Instant now = clock.instant();
        DevicePairing pairing = pairingRepository.findByPairingTokenHash(DeviceSecrets.sha256Hex(request.pairingToken()))
                .orElseThrow(() -> DeviceApiException.badRequest("PAIRING_TOKEN_INVALID", "Unknown pairing token"));

        if (pairing.getStatus() == PairingStatus.CLAIMED) {
            throw DeviceApiException.conflict("PAIRING_TOKEN_USED", "The pairing token was already used");
        }
        if (pairing.isExpiredAt(now)) {
            if (pairing.getStatus() != PairingStatus.EXPIRED) {
                pairing.setStatus(PairingStatus.EXPIRED);
                pairingRepository.save(pairing);
            }
            throw new DeviceApiException(HttpStatus.GONE, "PAIRING_TOKEN_EXPIRED", "The pairing token has expired");
        }

        String hardwareId = request.hardwareId().trim();
        // Everything that can fail is checked before the token is burned by claim().
        String initialName = safeName(request.name());
        Optional<Device> existing = deviceRepository.findByHardwareId(hardwareId);
        if (existing.isPresent() && !existing.get().getUserId().equals(pairing.getUserId())) {
            throw DeviceApiException.conflict("DEVICE_OWNED_BY_ANOTHER_USER",
                    "This cube is linked to another account; unbind it there first");
        }

        if (pairingRepository.claim(pairing.getPairingId(), now) != 1) {
            throw DeviceApiException.conflict("PAIRING_TOKEN_USED", "The pairing token was already used");
        }

        String secret = DeviceSecrets.newToken();
        boolean newDevice = existing.isEmpty();
        Device device = existing.orElseGet(Device::new);
        if (newDevice) {
            device.setHardwareId(hardwareId);
            device.setUserId(pairing.getUserId());
            device.setName(initialName);
            device.setCreatedAt(now);
        }
        // Re-pairing the same cube keeps its id, name, settings and history but rotates the secret.
        device.setDeviceSecretHash(DeviceSecrets.sha256Hex(secret));
        device.setSecretRotatedAt(now);
        device.setFirmwareVersion(request.firmwareVersion());
        device.setProtocolVersion(request.protocolVersion());
        if (request.capabilities() != null) {
            device.setCapabilities(sanitizer.toJson(sanitizer.capabilities(request.capabilities())));
        }
        device.setStatus(DeviceConnectionStatus.ONLINE);
        device.setLastSeenAt(now);
        device = deviceRepository.save(device);
        settingsService.ensureDefaults(device.getDeviceId());
        timerService.ensureState(device.getDeviceId(), device.getUserId());

        DevicePairing claimed = pairingRepository.findById(pairing.getPairingId()).orElseThrow();
        claimed.setClaimedDeviceId(device.getDeviceId());
        pairingRepository.save(claimed);

        publisher.publish(device.getUserId(), newDevice ? "DEVICE_ADDED" : "DEVICE_UPDATED", device.getDeviceId(),
                "device", deviceService.toDto(device));

        return new PairResponse(
                device.getDeviceId(),
                secret,
                now.toEpochMilli(),
                properties.heartbeatInterval().toSeconds(),
                properties.commandPollInterval().toSeconds()
        );
    }

    private static String safeName(String requested) {
        if (requested == null || requested.isBlank()) {
            return DEFAULT_DEVICE_NAME;
        }
        try {
            return DeviceService.cleanName(requested);
        } catch (DeviceApiException exception) {
            return DEFAULT_DEVICE_NAME;
        }
    }

    @Transactional
    public int expireOutdated() {
        return pairingRepository.expireOutdated(clock.instant());
    }
}
