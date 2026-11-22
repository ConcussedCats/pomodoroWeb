package com.example.telos.security.device;

/** Identity of an authenticated cube. It only ever acts on its own deviceId. */
public record DevicePrincipal(Long deviceId, Long userId, String hardwareId) {

    @Override
    public String toString() {
        return "device:" + deviceId;
    }
}
