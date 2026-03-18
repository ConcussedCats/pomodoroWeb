package com.example.telos.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;

public interface LogErrorService {
    void logWarn(HttpServletRequest request, HttpStatus httpStatus, Exception exception);

    void logError(HttpServletRequest request, HttpStatus httpStatus, Exception exception);
}
