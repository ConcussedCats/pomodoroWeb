package com.example.telos.service.device;

import com.example.telos.model.device.TimerMode;

import java.util.List;
import java.util.Optional;

/**
 * Server copy of the classic / compact phase patterns from static/js/timer-state.js,
 * used to keep cycle counters and the suggested next phase for a connected cube.
 * <p>
 * A position with cycleIndex == totalCycles means "whole focus session completed".
 */
public final class TimerPhasePlanner {

    public static final String CLASSIC = "classic";
    public static final String COMPACT = "compact";

    private static final List<TimerMode> CLASSIC_PHASES = List.of(
            TimerMode.WORK, TimerMode.SHORT_BREAK,
            TimerMode.WORK, TimerMode.SHORT_BREAK,
            TimerMode.WORK, TimerMode.SHORT_BREAK,
            TimerMode.WORK, TimerMode.LONG_BREAK
    );

    private static final List<TimerMode> COMPACT_PHASES = List.of(
            TimerMode.WORK, TimerMode.SHORT_BREAK,
            TimerMode.WORK, TimerMode.LONG_BREAK
    );

    public record Position(int cycleIndex, int phaseIndex) {
        public static final Position START = new Position(0, 0);
    }

    private final List<TimerMode> phases;
    private final int totalCycles;
    private final String patternType;

    public TimerPhasePlanner(String patternType, Integer totalCycles) {
        this.patternType = COMPACT.equals(patternType) ? COMPACT : CLASSIC;
        this.phases = COMPACT.equals(this.patternType) ? COMPACT_PHASES : CLASSIC_PHASES;
        this.totalCycles = totalCycles == null ? 4 : Math.min(Math.max(totalCycles, 1), 12);
    }

    public String patternType() {
        return patternType;
    }

    public int totalCycles() {
        return totalCycles;
    }

    public int workPhasesPerCycle() {
        return (int) phases.stream().filter(mode -> mode == TimerMode.WORK).count();
    }

    public boolean isCompleted(Position position) {
        return position.cycleIndex() >= totalCycles;
    }

    public Position normalize(Integer cycleIndex, Integer phaseIndex) {
        int cycle = cycleIndex == null ? 0 : Math.max(0, cycleIndex);
        if (cycle >= totalCycles) {
            return new Position(totalCycles, 0);
        }
        int phase = phaseIndex == null ? 0 : Math.min(Math.max(0, phaseIndex), phases.size() - 1);
        return new Position(cycle, phase);
    }

    public TimerMode modeAt(Position position) {
        if (isCompleted(position)) {
            return TimerMode.WORK;
        }
        return phases.get(position.phaseIndex());
    }

    public Optional<Position> next(Position position) {
        if (isCompleted(position)) {
            return Optional.empty();
        }
        if (position.phaseIndex() < phases.size() - 1) {
            return Optional.of(new Position(position.cycleIndex(), position.phaseIndex() + 1));
        }
        if (position.cycleIndex() < totalCycles - 1) {
            return Optional.of(new Position(position.cycleIndex() + 1, 0));
        }
        return Optional.empty();
    }

    /**
     * Position after a countdown of finishedMode completed while the pattern stood at base.
     * Mirrors transitionAfterCompletion() in timer-state.js, including its skip rule for manual overrides.
     */
    public Position afterCompletion(Position base, TimerMode finishedMode) {
        if (isCompleted(base)) {
            return base;
        }
        Optional<Position> nextPosition = next(base);
        TimerMode baseMode = modeAt(base);

        if (finishedMode != baseMode && nextPosition.isPresent()) {
            TimerMode nextMode = modeAt(nextPosition.get());
            boolean skipBreak = finishedMode.isBreak() && nextMode.isBreak();
            boolean skipWork = finishedMode == TimerMode.WORK && nextMode == TimerMode.WORK;
            if (skipBreak || skipWork) {
                nextPosition = next(nextPosition.get());
            }
        }

        return nextPosition.orElse(new Position(totalCycles, 0));
    }

    /** Position to use when a new countdown of startedMode begins at the given position. */
    public Position onStart(Position position) {
        return isCompleted(position) ? Position.START : position;
    }

    /** 1-based number of the work phase inside the current cycle, like getFilledDotsCount() in timer-state.js. */
    public int filledDots(Position position) {
        if (isCompleted(position)) {
            return workPhasesPerCycle();
        }
        for (int index = position.phaseIndex(); index >= 0; index--) {
            if (phases.get(index) == TimerMode.WORK) {
                int count = 0;
                for (int i = 0; i <= index; i++) {
                    if (phases.get(i) == TimerMode.WORK) count++;
                }
                return count;
            }
        }
        return 1;
    }
}
