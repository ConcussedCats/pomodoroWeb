package com.example.telos.model.device;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;

/** Hardware options of one cube. Timer durations stay in the owner's UserTimeSettings. */
@Getter
@Setter
@NoArgsConstructor
@ToString
@Entity
@Table(name = "device_settings")
public class DeviceSettings {

    public static final int DEFAULT_RGB_BRIGHTNESS = 60;

    @Id
    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "vibration_enabled", nullable = false)
    private Boolean vibrationEnabled = true;

    @Column(name = "sound_enabled", nullable = false)
    private Boolean soundEnabled = true;

    @Column(name = "rgb_brightness", nullable = false)
    private Integer rgbBrightness = DEFAULT_RGB_BRIGHTNESS;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static DeviceSettings defaultsFor(Long deviceId, Instant now) {
        DeviceSettings settings = new DeviceSettings();
        settings.setDeviceId(deviceId);
        settings.setUpdatedAt(now);
        return settings;
    }
}
