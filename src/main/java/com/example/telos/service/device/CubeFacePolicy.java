package com.example.telos.service.device;

import com.example.telos.model.device.CubeFace;
import com.example.telos.model.device.TimerMode;
import com.example.telos.model.device.TimerStatus;

import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;
import java.util.function.ToIntFunction;

/**
 * What flipping the cube to a face does. The firmware applies the same table offline;
 * the server uses it when a FACE_CHANGED event arrives without a state snapshot.
 * See docs/esp32/PROTOCOL.md, section 5.
 */
public final class CubeFacePolicy {

    public enum FaceAction {
        START_WORK, START_SHORT_BREAK, START_LONG_BREAK, PAUSE, NONE
    }

    private CubeFacePolicy() {
    }

    public static FaceAction actionOf(CubeFace face) {
        return switch (face) {
            case WORK -> FaceAction.START_WORK;
            case SHORT_BREAK -> FaceAction.START_SHORT_BREAK;
            case LONG_BREAK -> FaceAction.START_LONG_BREAK;
            case PAUSE -> FaceAction.PAUSE;
            case DISPLAY, TECH -> FaceAction.NONE;
        };
    }

    public static Map<CubeFace, FaceAction> table() {
        Map<CubeFace, FaceAction> table = new EnumMap<>(CubeFace.class);
        for (CubeFace face : CubeFace.values()) {
            table.put(face, actionOf(face));
        }
        return table;
    }

    public static Optional<TimerMode> modeOf(CubeFace face) {
        return switch (face) {
            case WORK -> Optional.of(TimerMode.WORK);
            case SHORT_BREAK -> Optional.of(TimerMode.SHORT_BREAK);
            case LONG_BREAK -> Optional.of(TimerMode.LONG_BREAK);
            default -> Optional.empty();
        };
    }

    /**
     * Resulting state after the flip, or empty when the flip changes nothing.
     *
     * @param durationOf full duration of a mode, from the owner's timer settings
     */
    public static Optional<TimerSnapshot> apply(CubeFace face, TimerSnapshot current, ToIntFunction<TimerMode> durationOf, Instant at) {
        if (face == CubeFace.PAUSE) {
            if (current.status() == TimerStatus.RUNNING) {
                return Optional.of(current.paused(at));
            }
            return Optional.empty();
        }

        Optional<TimerMode> targetMode = modeOf(face);
        if (targetMode.isEmpty()) {
            return Optional.empty();
        }

        TimerMode mode = targetMode.get();
        if (current.mode() == mode && current.status() == TimerStatus.PAUSED) {
            return Optional.of(current.resumed(at));
        }
        if (current.mode() == mode && current.status() == TimerStatus.RUNNING && current.remainingSecondsAt(at) > 0) {
            return Optional.empty();
        }
        return Optional.of(TimerSnapshot.started(mode, durationOf.applyAsInt(mode), at));
    }
}
