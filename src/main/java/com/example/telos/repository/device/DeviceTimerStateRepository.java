package com.example.telos.repository.device;

import com.example.telos.model.device.DeviceTimerState;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeviceTimerStateRepository extends JpaRepository<DeviceTimerState, Long> {

    /** Row lock so concurrent event batches / acks of one device are applied one after another. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM DeviceTimerState s WHERE s.deviceId = :deviceId")
    Optional<DeviceTimerState> findForUpdate(@Param("deviceId") Long deviceId);
}
