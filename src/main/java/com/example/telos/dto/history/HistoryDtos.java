package com.example.telos.dto.history;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;
import java.util.UUID;

/** Pomodoro session history and statistics payloads. Times are epoch millis. */
public final class HistoryDtos {

    private HistoryDtos() {
    }

    /** A finished or interrupted session of the browser timer (Standalone Mode). */
    public record RecordSessionRequest(
            @NotNull(message = "externalId is required")
            UUID externalId,
            @NotBlank(message = "type is required")
            String type,
            @NotBlank(message = "status is required")
            @Pattern(regexp = "COMPLETED|INTERRUPTED", message = "status must be COMPLETED or INTERRUPTED")
            String status,
            @NotNull(message = "plannedDurationSeconds is required")
            @Min(value = 60, message = "plannedDurationSeconds must be at least 60")
            @Max(value = 14400, message = "plannedDurationSeconds must be at most 14400")
            Integer plannedDurationSeconds,
            @NotNull(message = "actualDurationSeconds is required")
            @Min(value = 0, message = "actualDurationSeconds must not be negative")
            @Max(value = 14400, message = "actualDurationSeconds must be at most 14400")
            Integer actualDurationSeconds,
            @NotNull(message = "startedAt is required")
            Long startedAt,
            @NotNull(message = "finishedAt is required")
            Long finishedAt
    ) {
    }

    public record SessionDto(
            Long id,
            UUID externalId,
            String type,
            String webMode,
            String source,
            String status,
            Long deviceId,
            int plannedDurationSeconds,
            int actualDurationSeconds,
            Long startedAt,
            Long finishedAt
    ) {
    }

    public record SessionPageDto(List<SessionDto> items, int page, int size, long totalItems, int totalPages) {
    }

    public record PeriodStatsDto(
            int completedWorkSessions,
            int interruptedSessions,
            int focusSeconds,
            int breakSeconds
    ) {
    }

    public record DayStatsDto(String date, int completedWorkSessions, int focusSeconds) {
    }

    public record SessionStatsDto(String timeZone, PeriodStatsDto today, PeriodStatsDto week, List<DayStatsDto> days) {
    }
}
