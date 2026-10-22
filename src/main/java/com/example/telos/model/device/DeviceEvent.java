package com.example.telos.model.device;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.UUID;

/** Log of device events; the unique (device, eventId) pair makes event replays harmless. */
@Getter
@Setter
@NoArgsConstructor
@ToString
@Entity
@Table(name = "device_events")
public class DeviceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_row_id", nullable = false)
    private Long eventRowId;

    @Column(name = "device_id", nullable = false)
    private Long deviceId;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "boot_id", length = 36)
    private String bootId;

    @Column(name = "seq")
    private Long seq;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 20)
    private DeviceEventType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "face", length = 16)
    private CubeFace face;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 12)
    private DeviceEventResult result;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;
}
