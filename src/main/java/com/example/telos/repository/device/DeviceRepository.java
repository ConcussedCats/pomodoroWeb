package com.example.telos.repository.device;

import com.example.telos.model.device.Device;
import com.example.telos.model.device.DeviceConnectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {
    List<Device> findByUserIdOrderByCreatedAtAsc(Long userId);

    Optional<Device> findByDeviceIdAndUserId(Long deviceId, Long userId);

    Optional<Device> findByHardwareId(String hardwareId);

    List<Device> findByStatusAndLastSeenAtBefore(DeviceConnectionStatus status, Instant threshold);
}
