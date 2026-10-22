package com.example.telos.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/** Timings of the ESP32 integration. Defaults match docs/esp32/PROTOCOL.md. */
@ConfigurationProperties(prefix = "telos.device")
public record DeviceProperties(
        Duration pairingTtl,
        Duration heartbeatInterval,
        Duration offlineAfter,
        Duration commandTtl,
        Duration commandPollInterval,
        Boolean schedulingEnabled
) {
    public DeviceProperties {
        if (schedulingEnabled == null) schedulingEnabled = true;
        if (pairingTtl == null) pairingTtl = Duration.ofMinutes(5);
        if (heartbeatInterval == null) heartbeatInterval = Duration.ofSeconds(30);
        if (offlineAfter == null) offlineAfter = Duration.ofSeconds(90);
        if (commandTtl == null) commandTtl = Duration.ofSeconds(30);
        if (commandPollInterval == null) commandPollInterval = Duration.ofSeconds(3);
    }

    public static DeviceProperties defaults() {
        return new DeviceProperties(null, null, null, null, null, true);
    }
}
