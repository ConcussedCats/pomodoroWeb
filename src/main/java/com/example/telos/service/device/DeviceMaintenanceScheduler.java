package com.example.telos.service.device;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodic housekeeping: OFFLINE detection, command and pairing expiry. */
@Component
@EnableScheduling
@ConditionalOnProperty(prefix = "telos.device", name = "scheduling-enabled", havingValue = "true", matchIfMissing = true)
public class DeviceMaintenanceScheduler {
    private static final Logger logger = LoggerFactory.getLogger(DeviceMaintenanceScheduler.class);

    private final DevicePresenceService presenceService;
    private final DeviceTimerService timerService;
    private final DevicePairingService pairingService;
    private final DeviceEventRetention eventRetention;

    public DeviceMaintenanceScheduler(DevicePresenceService presenceService,
                                      DeviceTimerService timerService,
                                      DevicePairingService pairingService,
                                      DeviceEventRetention eventRetention) {
        this.presenceService = presenceService;
        this.timerService = timerService;
        this.pairingService = pairingService;
        this.eventRetention = eventRetention;
    }

    /** The event log is only needed for de-duplication of replays; old rows are removed once a day. */
    @Scheduled(cron = "${telos.device.event-retention-cron:0 30 3 * * *}")
    public void pruneEvents() {
        try {
            eventRetention.prune();
        } catch (RuntimeException exception) {
            logger.warn("Device event retention failed", exception);
        }
    }

    @Scheduled(fixedDelayString = "${telos.device.sweep-interval:PT5S}", initialDelayString = "PT10S")
    public void sweep() {
        try {
            presenceService.markSilentDevicesOffline();
            timerService.expireOverdueCommands();
            pairingService.expireOutdated();
        } catch (RuntimeException exception) {
            logger.warn("Device maintenance sweep failed", exception);
        }
    }
}
