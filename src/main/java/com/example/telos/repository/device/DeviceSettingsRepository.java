package com.example.telos.repository.device;

import com.example.telos.model.device.DeviceSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeviceSettingsRepository extends JpaRepository<DeviceSettings, Long> {
}
