package com.example.telos.model.history;

import com.example.telos.model.device.TimerMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@ToString
@Entity
@Table(name = "pomodoro_sessions")
public class PomodoroSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_row_id", nullable = false)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Null for sessions of the browser timer without a cube. */
    @Column(name = "device_id")
    private Long deviceId;

    /** Client generated id (browser UUID or cube sessionId); unique per user, used for de-duplication. */
    @Column(name = "external_id", nullable = false)
    private UUID externalId;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_type", nullable = false, length = 16)
    private TimerMode type;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 10)
    private SessionSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 12)
    private SessionStatus status;

    @Column(name = "planned_duration_seconds", nullable = false)
    private Integer plannedDuration;

    @Column(name = "actual_duration_seconds", nullable = false)
    private Integer actualDuration = 0;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    private void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
