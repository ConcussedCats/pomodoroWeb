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
@ToString(exclude = "pairingTokenHash")
@Entity
@Table(name = "device_pairings")
public class DevicePairing {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pairing_id", nullable = false)
    private Long pairingId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "pairing_token_hash", nullable = false, unique = true, length = 64)
    private String pairingTokenHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private PairingStatus status = PairingStatus.CREATED;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "claimed_at")
    private Instant claimedAt;

    @Column(name = "claimed_device_id")
    private Long claimedDeviceId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** True when the pairing can no longer be claimed because of its age (or it was already marked expired). */
    public boolean isExpiredAt(Instant now) {
        return status == PairingStatus.EXPIRED
                || (status == PairingStatus.CREATED && !now.isBefore(expiresAt));
    }
}
