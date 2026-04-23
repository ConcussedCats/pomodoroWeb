package com.example.telos.exception;

import com.example.telos.dto.ErrorDto;
import com.example.telos.service.LogErrorService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.OffsetDateTime;

@RestControllerAdvice(annotations = RestController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
@AllArgsConstructor
public class RestExceptionHandler {
    private final LogErrorService logErrorService;

    @ExceptionHandler(NullEntityReferenceException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorDto handleNullEntity(HttpServletRequest request, NullEntityReferenceException exception) {
        logErrorService.logWarn(request, HttpStatus.BAD_REQUEST, exception);
        return buildError(request, HttpStatus.BAD_REQUEST, exception.getMessage(), "NULL_ENTITY");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorDto handleIllegalArgument(HttpServletRequest request, IllegalArgumentException exception) {
        logErrorService.logWarn(request, HttpStatus.BAD_REQUEST, exception);
        return buildError(request, HttpStatus.BAD_REQUEST, exception.getMessage(), "INVALID_ARGUMENT");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorDto handleValidation(HttpServletRequest request, MethodArgumentNotValidException exception) {
        FieldError fieldError = exception.getBindingResult().getFieldError();
        String message = fieldError != null ? fieldError.getDefaultMessage() : "Request validation failed";
        logErrorService.logWarn(request, HttpStatus.BAD_REQUEST, exception);
        return buildError(request, HttpStatus.BAD_REQUEST, message, "VALIDATION_ERROR");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorDto handleMalformedBody(HttpServletRequest request, HttpMessageNotReadableException exception) {
        logErrorService.logWarn(request, HttpStatus.BAD_REQUEST, exception);
        return buildError(request, HttpStatus.BAD_REQUEST, "Request body is missing or malformed", "MALFORMED_BODY");
    }

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorDto handleEntityNotFound(HttpServletRequest request, EntityNotFoundException exception) {
        logErrorService.logWarn(request, HttpStatus.NOT_FOUND, exception);
        return buildError(request, HttpStatus.NOT_FOUND, exception.getMessage(), "ENTITY_NOT_FOUND");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorDto handleNoResource(HttpServletRequest request, NoResourceFoundException exception) {
        logErrorService.logWarn(request, HttpStatus.NOT_FOUND, exception);
        return buildError(request, HttpStatus.NOT_FOUND, "API endpoint was not found", "ENDPOINT_NOT_FOUND");
    }

    @ExceptionHandler(UsernameAlreadyTakenException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorDto handleUsernameConflict(HttpServletRequest request, UsernameAlreadyTakenException exception) {
        logErrorService.logWarn(request, HttpStatus.CONFLICT, exception);
        return buildError(request, HttpStatus.CONFLICT, exception.getMessage(), "USERNAME_CONFLICT");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public ErrorDto handleMethodNotSupported(HttpServletRequest request, HttpRequestMethodNotSupportedException exception) {
        logErrorService.logWarn(request, HttpStatus.METHOD_NOT_ALLOWED, exception);
        return buildError(request, HttpStatus.METHOD_NOT_ALLOWED, "HTTP method is not supported for this endpoint", "METHOD_NOT_ALLOWED");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorDto handleUnexpected(HttpServletRequest request, Exception exception) {
        logErrorService.logError(request, HttpStatus.INTERNAL_SERVER_ERROR, exception);
        return buildError(request, HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", "INTERNAL_ERROR");
    }

    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorDto handleAuthentication(HttpServletRequest request, AuthenticationException exception) {
        logErrorService.logWarn(request, HttpStatus.UNAUTHORIZED, exception);
        return buildError(
                request,
                HttpStatus.UNAUTHORIZED,
                "Invalid login or password",
                "UNAUTHORIZED"
        );
    }


    private ErrorDto buildError(HttpServletRequest request, HttpStatus status, String message, String errorCode) {
        return ErrorDto.builder()
                .timestamp(OffsetDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .message(message)
                .path(request.getRequestURI())
                .method(request.getMethod())
                .errorCode(errorCode)
                .build();
    }
}
