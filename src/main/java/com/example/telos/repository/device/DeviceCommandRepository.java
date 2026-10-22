package com.example.telos.repository.device;

import com.example.telos.model.device.DeviceCommand;
import com.example.telos.model.device.DeviceCommandStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceCommandRepository extends JpaRepository<DeviceCommand, UUID> {
    List<DeviceCommand> findByDeviceIdAndStatusInAndExpiresAtAfterOrderByCreatedAtAsc(
            Long deviceId, Collection<DeviceCommandStatus> statuses, Instant now);

    long countByDeviceIdAndStatusInAndExpiresAtAfter(
            Long deviceId, Collection<DeviceCommandStatus> statuses, Instant now);

    Optional<DeviceCommand> findByCommandIdAndDeviceId(UUID commandId, Long deviceId);

    Optional<DeviceCommand> findByDeviceIdAndClientRequestId(Long deviceId, String clientRequestId);

    List<DeviceCommand> findByStatusInAndExpiresAtLessThanEqual(Collection<DeviceCommandStatus> statuses, Instant now);

    List<DeviceCommand> findTop20ByDeviceIdOrderByCreatedAtDesc(Long deviceId);

    /** Moves an open command to a final status; returns 0 when another request already finished it. */
    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE DeviceCommand c
            SET c.status = :status, c.errorCode = :errorCode, c.completedAt = :now, c.resultingVersion = :version
            WHERE c.commandId = :commandId AND c.status IN :openStatuses
            """)
    int complete(@Param("commandId") UUID commandId,
                 @Param("openStatuses") Collection<DeviceCommandStatus> openStatuses,
                 @Param("status") DeviceCommandStatus status,
                 @Param("errorCode") String errorCode,
                 @Param("now") Instant now,
                 @Param("version") Long version);
}
