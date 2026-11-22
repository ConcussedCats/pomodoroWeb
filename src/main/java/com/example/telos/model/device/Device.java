package com.example.telos.model.device;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@ToString(exclude = "deviceSecretHash")
@Entity
@Table(name = "devices")
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "hardware_id", nullable = false, unique = true, length = 64)
    private String hardwareId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "name", nullable = false, length = 40)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private DeviceConnectionStatus status = DeviceConnectionStatus.OFFLINE;

    @Column(name = "device_secret_hash", nullable = false, length = 64)
    private String deviceSecretHash;

    @Column(name = "firmware_version", length = 32)
    private String firmwareVersion;

    @Column(name = "protocol_version")
    private Integer protocolVersion;

    /** JSON object with the hardware features the firmware reported, e.g. {"vibration":true}. */
    @Column(name = "capabilities")
    private String capabilities;

    /** JSON object with the last technical metrics the firmware reported (only measured values). */
    @Column(name = "metrics")
    private String metrics;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_face", length = 16)
    private CubeFace lastFace;

    /** configHash the firmware reported in its last heartbeat, i.e. the config it is really using. */
    @Column(name = "applied_config_hash", length = 64)
    private String appliedConfigHash;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    @Column(name = "secret_rotated_at", nullable = false)
    private Instant secretRotatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    private void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (secretRotatedAt == null) secretRotatedAt = now;
    }
}
