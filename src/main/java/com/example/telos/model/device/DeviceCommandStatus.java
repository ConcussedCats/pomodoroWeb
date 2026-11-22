package com.example.telos.model.device;

public enum DeviceCommandStatus {
    PENDING,
    DELIVERED,
    EXECUTED,
    REJECTED,
    EXPIRED,
    SUPERSEDED;

    public boolean isFinal() {
        return this == EXECUTED || this == REJECTED || this == EXPIRED || this == SUPERSEDED;
    }
}
