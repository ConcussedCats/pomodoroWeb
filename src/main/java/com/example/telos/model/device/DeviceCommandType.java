package com.example.telos.model.device;

public enum DeviceCommandType {
    START(true),
    PAUSE(false),
    RESUME(false),
    STOP(false),
    SWITCH_MODE(true);

    private final boolean requiresMode;

    DeviceCommandType(boolean requiresMode) {
        this.requiresMode = requiresMode;
    }

    public boolean requiresMode() {
        return requiresMode;
    }
}
