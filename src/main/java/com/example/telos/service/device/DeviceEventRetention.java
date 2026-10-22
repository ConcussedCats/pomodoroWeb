package com.example.telos.service.device;

import com.example.telos.repository.device.DeviceEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;

/** Removes device events older than 30 days; a cube never replays events that old. */
@Service
public class DeviceEventRetention {
    static final Duration RETENTION = Duration.ofDays(30);

    private final DeviceEventRepository eventRepository;
    private final Clock clock;

    public DeviceEventRetention(DeviceEventRepository eventRepository, Clock clock) {
        this.eventRepository = eventRepository;
        this.clock = clock;
    }

    @Transactional
    public int prune() {
        return eventRepository.deleteReceivedBefore(clock.instant().minus(RETENTION));
    }
}
