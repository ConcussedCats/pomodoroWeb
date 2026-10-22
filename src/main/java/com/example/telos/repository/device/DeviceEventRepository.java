package com.example.telos.repository.device;

import com.example.telos.model.device.DeviceEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface DeviceEventRepository extends JpaRepository<DeviceEvent, Long> {
    boolean existsByDeviceIdAndEventId(Long deviceId, UUID eventId);

    @Modifying
    @Query("DELETE FROM DeviceEvent e WHERE e.receivedAt < :threshold")
    int deleteReceivedBefore(@Param("threshold") Instant threshold);
}
