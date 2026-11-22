package com.example.telos.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Business error of the device / pairing / timer sync API with a stable machine readable code. */
@Getter
public class DeviceApiException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;

    public DeviceApiException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public static DeviceApiException notFound(String what) {
        return new DeviceApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", what + " not found");
    }

    public static DeviceApiException badRequest(String errorCode, String message) {
        return new DeviceApiException(HttpStatus.BAD_REQUEST, errorCode, message);
    }

    public static DeviceApiException conflict(String errorCode, String message) {
        return new DeviceApiException(HttpStatus.CONFLICT, errorCode, message);
    }
}
