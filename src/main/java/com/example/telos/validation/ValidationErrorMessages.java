package com.example.telos.validation;

import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;

import java.util.List;

public class ValidationErrorMessages {
    private static final List<String> CONSTRAINT_PRIORITY = List.of(
            "NotBlank",
            "NotNull",
            "NotEmpty",
            "Size",
            "Pattern"
    );

    private ValidationErrorMessages() {
    }

    public static String firstMessage(BindingResult bindingResult, String fallbackMessage) {
        return firstMessage(bindingResult, List.of(), fallbackMessage);
    }

    public static String firstMessage(BindingResult bindingResult, List<String> fieldPriority, String fallbackMessage) {
        for (String field : fieldPriority) {
            FieldError fieldError = firstErrorForField(bindingResult, field);
            if (fieldError != null) {
                return messageOrFallback(fieldError, fallbackMessage);
            }
        }

        for (String constraint : CONSTRAINT_PRIORITY) {
            FieldError fieldError = firstErrorForConstraint(bindingResult, constraint);
            if (fieldError != null) {
                return messageOrFallback(fieldError, fallbackMessage);
            }
        }

        FieldError fieldError = bindingResult.getFieldError();
        return fieldError != null ? messageOrFallback(fieldError, fallbackMessage) : fallbackMessage;
    }

    private static FieldError firstErrorForField(BindingResult bindingResult, String field) {
        List<FieldError> fieldErrors = bindingResult.getFieldErrors(field);

        for (String constraint : CONSTRAINT_PRIORITY) {
            for (FieldError fieldError : fieldErrors) {
                if (constraint.equals(fieldError.getCode())) {
                    return fieldError;
                }
            }
        }

        return fieldErrors.isEmpty() ? null : fieldErrors.getFirst();
    }

    private static FieldError firstErrorForConstraint(BindingResult bindingResult, String constraint) {
        for (FieldError fieldError : bindingResult.getFieldErrors()) {
            if (constraint.equals(fieldError.getCode())) {
                return fieldError;
            }
        }

        return null;
    }

    private static String messageOrFallback(FieldError fieldError, String fallbackMessage) {
        return fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : fallbackMessage;
    }
}
