package com.example.telos.service.history;

import com.example.telos.dto.history.HistoryDtos.DayStatsDto;
import com.example.telos.dto.history.HistoryDtos.PeriodStatsDto;
import com.example.telos.dto.history.HistoryDtos.RecordSessionRequest;
import com.example.telos.dto.history.HistoryDtos.SessionDto;
import com.example.telos.dto.history.HistoryDtos.SessionPageDto;
import com.example.telos.dto.history.HistoryDtos.SessionStatsDto;
import com.example.telos.exception.DeviceApiException;
import com.example.telos.model.device.TimerMode;
import com.example.telos.model.history.PomodoroSession;
import com.example.telos.model.history.SessionSource;
import com.example.telos.model.history.SessionStatus;
import com.example.telos.repository.PomodoroSessionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Server-side history of Pomodoro sessions. Every row is keyed by (user, externalId),
 * so replayed device events or repeated browser posts never create duplicates.
 */
@Service
public class PomodoroSessionService {
    public static final ZoneId DEFAULT_ZONE = ZoneId.of("Europe/Kyiv");
    private static final Duration CLOCK_TOLERANCE = Duration.ofMinutes(2);

    private final PomodoroSessionRepository repository;
    private final Clock clock;

    public PomodoroSessionService(PomodoroSessionRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public record Recorded(SessionDto session, boolean created) {
    }

    /** Stores a session of the browser timer (Standalone Mode). Idempotent by externalId. */
    @Transactional
    public Recorded recordWebSession(Long userId, RecordSessionRequest request) {
        TimerMode type = TimerMode.parse(request.type())
                .orElseThrow(() -> DeviceApiException.badRequest("INVALID_MODE", "Unknown session type"));
        Instant startedAt = Instant.ofEpochMilli(request.startedAt());
        Instant finishedAt = Instant.ofEpochMilli(request.finishedAt());
        Instant latestAllowed = clock.instant().plus(CLOCK_TOLERANCE);

        if (finishedAt.isBefore(startedAt)) {
            throw DeviceApiException.badRequest("INVALID_TIME_RANGE", "finishedAt must not be before startedAt");
        }
        if (finishedAt.isAfter(latestAllowed)) {
            throw DeviceApiException.badRequest("INVALID_TIME_RANGE", "finishedAt must not be in the future");
        }
        if (request.actualDurationSeconds() > request.plannedDurationSeconds() + 60) {
            throw DeviceApiException.badRequest("INVALID_DURATION", "actualDurationSeconds must not exceed the planned duration");
        }

        Optional<PomodoroSession> existing = repository.findByUserIdAndExternalId(userId, request.externalId());
        if (existing.isPresent()) {
            return new Recorded(toDto(existing.get()), false);
        }

        PomodoroSession session = new PomodoroSession();
        session.setUserId(userId);
        session.setExternalId(request.externalId());
        session.setType(type);
        session.setSource(SessionSource.WEB);
        session.setStatus(SessionStatus.valueOf(request.status()));
        session.setPlannedDuration(request.plannedDurationSeconds());
        session.setActualDuration(Math.min(request.actualDurationSeconds(), request.plannedDurationSeconds()));
        session.setStartedAt(startedAt);
        session.setFinishedAt(finishedAt);
        // If two tabs post the same session at the same moment, the unique key rejects the second insert (409).
        return new Recorded(toDto(repository.saveAndFlush(session)), true);
    }

    /**
     * Creates or advances a cube session. A session only moves forward:
     * IN_PROGRESS -> COMPLETED / INTERRUPTED; a closed session is never changed again.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void upsertDeviceSession(Long userId, Long deviceId, UUID sessionId, TimerMode type, int plannedSeconds,
                                    Instant startedAt, SessionStatus status, int actualSeconds, Instant finishedAt) {
        if (sessionId == null) {
            return;
        }
        int safePlanned = Math.max(1, plannedSeconds);
        int safeActual = Math.min(Math.max(0, actualSeconds), safePlanned);
        Optional<PomodoroSession> existing = repository.findByUserIdAndExternalId(userId, sessionId);

        if (existing.isEmpty()) {
            PomodoroSession session = new PomodoroSession();
            session.setUserId(userId);
            session.setDeviceId(deviceId);
            session.setExternalId(sessionId);
            session.setType(type);
            session.setSource(SessionSource.DEVICE);
            session.setStatus(status);
            session.setPlannedDuration(safePlanned);
            session.setActualDuration(safeActual);
            session.setStartedAt(startedAt);
            session.setFinishedAt(status == SessionStatus.IN_PROGRESS ? null : finishedAt);
            repository.save(session);
            return;
        }

        PomodoroSession session = existing.get();
        if (session.getStatus() != SessionStatus.IN_PROGRESS || status == SessionStatus.IN_PROGRESS) {
            return;
        }
        session.setStatus(status);
        session.setActualDuration(safeActual);
        session.setFinishedAt(finishedAt);
        repository.save(session);
    }

    @Transactional(readOnly = true)
    public SessionPageDto history(Long userId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        Page<PomodoroSession> result = repository.findByUserIdOrderByStartedAtDesc(userId, PageRequest.of(safePage, safeSize));
        return new SessionPageDto(
                result.getContent().stream().map(this::toDto).toList(),
                safePage,
                safeSize,
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    /** Today and the last 7 days (including today) in the given time zone. */
    @Transactional(readOnly = true)
    public SessionStatsDto stats(Long userId, String timeZone) {
        ZoneId zone = resolveZone(timeZone);
        LocalDate today = LocalDate.now(clock.withZone(zone));
        LocalDate firstDay = today.minusDays(6);
        Instant from = firstDay.atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<PomodoroSession> sessions = repository.findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThan(userId, from, to);

        PeriodAccumulator week = new PeriodAccumulator();
        PeriodAccumulator todayStats = new PeriodAccumulator();
        List<DayStatsDto> days = new ArrayList<>();

        for (int offset = 0; offset < 7; offset++) {
            LocalDate day = firstDay.plusDays(offset);
            PeriodAccumulator dayStats = new PeriodAccumulator();
            for (PomodoroSession session : sessions) {
                if (LocalDate.ofInstant(session.getStartedAt(), zone).equals(day)) {
                    dayStats.add(session);
                    week.add(session);
                    if (day.equals(today)) {
                        todayStats.add(session);
                    }
                }
            }
            days.add(new DayStatsDto(day.toString(), dayStats.completedWork, dayStats.focusSeconds));
        }

        return new SessionStatsDto(zone.getId(), todayStats.toDto(), week.toDto(), days);
    }

    private ZoneId resolveZone(String timeZone) {
        if (timeZone == null || timeZone.isBlank()) {
            return DEFAULT_ZONE;
        }
        try {
            return ZoneId.of(timeZone.trim());
        } catch (DateTimeException exception) {
            throw DeviceApiException.badRequest("INVALID_TIME_ZONE", "Unknown time zone");
        }
    }

    public SessionDto toDto(PomodoroSession session) {
        return new SessionDto(
                session.getId(),
                session.getExternalId(),
                session.getType().name(),
                session.getType().getWebMode(),
                session.getSource().name(),
                session.getStatus().name(),
                session.getDeviceId(),
                session.getPlannedDuration(),
                session.getActualDuration(),
                session.getStartedAt().toEpochMilli(),
                session.getFinishedAt() == null ? null : session.getFinishedAt().toEpochMilli()
        );
    }

    private static final class PeriodAccumulator {
        private int completedWork;
        private int interrupted;
        private int focusSeconds;
        private int breakSeconds;

        void add(PomodoroSession session) {
            if (session.getStatus() == SessionStatus.INTERRUPTED) {
                interrupted++;
            }
            if (session.getType() == TimerMode.WORK) {
                focusSeconds += session.getActualDuration();
                if (session.getStatus() == SessionStatus.COMPLETED) {
                    completedWork++;
                }
            } else {
                breakSeconds += session.getActualDuration();
            }
        }

        PeriodStatsDto toDto() {
            return new PeriodStatsDto(completedWork, interrupted, focusSeconds, breakSeconds);
        }
    }
}
