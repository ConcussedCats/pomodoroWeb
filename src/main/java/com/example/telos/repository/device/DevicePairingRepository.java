package com.example.telos.repository.device;

import com.example.telos.model.device.DevicePairing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface DevicePairingRepository extends JpaRepository<DevicePairing, Long> {
    Optional<DevicePairing> findByPairingTokenHash(String pairingTokenHash);

    Optional<DevicePairing> findByPairingIdAndUserId(Long pairingId, Long userId);

    /**
     * Atomically claims a pairing. Returns 1 only for the first caller while the token is still valid,
     * which makes the token strictly one-time even under concurrent requests.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE DevicePairing p
            SET p.status = com.example.telos.model.device.PairingStatus.CLAIMED, p.claimedAt = :now
            WHERE p.pairingId = :pairingId
              AND p.status = com.example.telos.model.device.PairingStatus.CREATED
              AND p.expiresAt > :now
            """)
    int claim(@Param("pairingId") Long pairingId, @Param("now") Instant now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE DevicePairing p
            SET p.status = com.example.telos.model.device.PairingStatus.EXPIRED
            WHERE p.userId = :userId
              AND p.status = com.example.telos.model.device.PairingStatus.CREATED
            """)
    int expireOpenPairingsOfUser(@Param("userId") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE DevicePairing p
            SET p.status = com.example.telos.model.device.PairingStatus.EXPIRED
            WHERE p.status = com.example.telos.model.device.PairingStatus.CREATED
              AND p.expiresAt <= :now
            """)
    int expireOutdated(@Param("now") Instant now);
}
