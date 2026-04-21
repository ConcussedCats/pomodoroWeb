package com.example.telos.exception;

import com.example.telos.service.LogErrorService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.server.ResponseStatusException;

@ControllerAdvice(annotations = Controller.class)
@Order(Ordered.LOWEST_PRECEDENCE)
@AllArgsConstructor
public class GlobalExceptionHandler {
    private final LogErrorService logErrorService;

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ModelAndView handleMethodNotSupported(HttpServletRequest request, HttpRequestMethodNotSupportedException exception) {
        logErrorService.logWarn(request, HttpStatus.METHOD_NOT_ALLOWED, exception);
        return buildErrorPage(HttpStatus.METHOD_NOT_ALLOWED, "Method not allowed");
    }

    @ExceptionHandler(NullEntityReferenceException.class)
    public ModelAndView handleNullEntity(HttpServletRequest request, NullEntityReferenceException exception) {
        logErrorService.logWarn(request, HttpStatus.BAD_REQUEST, exception);
        return buildErrorPage(HttpStatus.BAD_REQUEST, "Bad request");
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ModelAndView handleEntityNotFound(HttpServletRequest request, EntityNotFoundException exception) {
        logErrorService.logWarn(request, HttpStatus.NOT_FOUND, exception);
        return buildErrorPage(HttpStatus.NOT_FOUND, "Page or resource not found");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ModelAndView handleAccessDenied(HttpServletRequest request, AccessDeniedException exception) {
        logErrorService.logWarn(request, HttpStatus.FORBIDDEN, exception);
        return new ModelAndView("error/403");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ModelAndView handleNoResource(HttpServletRequest request, NoResourceFoundException exception) {
        logErrorService.logWarn(request, HttpStatus.NOT_FOUND, exception);
        return new ModelAndView("error/404");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ModelAndView handleResponseStatus(HttpServletRequest request, ResponseStatusException exception) {
        HttpStatus httpStatus = HttpStatus.resolve(exception.getStatusCode().value());
        if (httpStatus == null) {
            logErrorService.logError(request, HttpStatus.INTERNAL_SERVER_ERROR, exception);
            return buildErrorPage(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong on the server");
        }

        if (httpStatus == HttpStatus.NOT_FOUND) {
            logErrorService.logWarn(request, HttpStatus.NOT_FOUND, exception);
            return new ModelAndView("error/404");
        }

        if (httpStatus == HttpStatus.FORBIDDEN) {
            logErrorService.logWarn(request, HttpStatus.FORBIDDEN, exception);
            return new ModelAndView("error/403");
        }

        logErrorService.logWarn(request, httpStatus, exception);
        return buildErrorPage(httpStatus, exception.getReason() != null ? exception.getReason() : httpStatus.getReasonPhrase());
    }

    @ExceptionHandler(Exception.class)
    public ModelAndView handleUnexpected(HttpServletRequest request, Exception exception) {
        logErrorService.logError(request, HttpStatus.INTERNAL_SERVER_ERROR, exception);
        return buildErrorPage(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong on the server");
    }

    private ModelAndView buildErrorPage(HttpStatus httpStatus, String message) {
        ModelAndView modelAndView = new ModelAndView("error/error");
        modelAndView.addObject("code", httpStatus.value() + " / " + httpStatus.getReasonPhrase());
        modelAndView.addObject("message", message);
        return modelAndView;
    }
}
