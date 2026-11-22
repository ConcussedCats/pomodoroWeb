package com.example.telos.model.device;

public enum DeviceCommandStatus {
    PENDING,
    DELIVERED,
    EXECUTED,
    REJECTED,
    EXPIRED;

    public boolean isFinal() {
        return this == EXECUTED || this == REJECTED || this == EXPIRED;
    }
}
