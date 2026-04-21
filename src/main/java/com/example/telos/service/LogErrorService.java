package com.example.telos.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;

import com.example.telos.model.ErrorLog;

import java.util.List;

public interface LogErrorService {
    void logWarn(HttpServletRequest request, HttpStatus httpStatus, Exception exception);

    void logError(HttpServletRequest request, HttpStatus httpStatus, Exception exception);

    List<ErrorLog> findAllByNewestFirst();
}
