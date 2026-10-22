package com.example.telos.model.device;

public enum DeviceCommandType {
    START(true),
    PAUSE(false),
    RESUME(false),
    STOP(false),
    SWITCH_MODE(true),
    /** Continue the browser phase on the cube (handover browser -> cube). */
    SET_STATE(true),
    /** The browser continues the phase: the cube stops without closing the history session. */
    RELEASE(false);

    private final boolean requiresMode;

    DeviceCommandType(boolean requiresMode) {
        this.requiresMode = requiresMode;
    }

    public boolean requiresMode() {
        return requiresMode;
    }
}
