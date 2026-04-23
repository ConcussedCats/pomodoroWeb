package com.example.telos.service.impl;

import com.example.telos.model.ErrorLog;
import com.example.telos.repository.LogErrorRepository;
import com.example.telos.service.LogErrorService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
public class LogErrorServiceImpl implements LogErrorService {

    private static final Logger logger = LoggerFactory.getLogger(LogErrorServiceImpl.class);
    private final LogErrorRepository logErrorRepository;

    @Override
    public void logWarn(HttpServletRequest request, HttpStatus httpStatus, Exception exception) {
        String errorDescription = buildDescription(request, httpStatus, exception);
        logger.warn(errorDescription);
    }

    @Override
    public void logError(HttpServletRequest request, HttpStatus httpStatus, Exception exception) {
        String errorDescription = buildDescription(request, httpStatus, exception);

        logger.error(errorDescription, exception);

        if (!shouldPersist(httpStatus)) {
            return;
        }

        try {
            ErrorLog errorLog = new ErrorLog();
            errorLog.setHttpError(httpStatus.value());
            errorLog.setErrorDescription(errorDescription);
            logErrorRepository.save(errorLog);
        } catch (Exception logException) {
            logger.error("Failed to log error", logException);
        }
    }

    @Override
    public List<ErrorLog> findAllByNewestFirst() {
        return logErrorRepository.findAllByOrderByOccurredAtDesc();
    }

    private String buildDescription(HttpServletRequest request, HttpStatus httpStatus, Exception exception) {
        String method = request.getMethod();
        String path = request.getRequestURI();
        String exceptionType = exception.getClass().getSimpleName();

        return "status=" + httpStatus.value()
                + ", method=" + method
                + ", path=" + path
                + ", exception=" + exceptionType;
    }

    private boolean shouldPersist(HttpStatus status) {
        return status.is5xxServerError();
    }
}
