package com.example.telos.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ValidUsernameValidator implements ConstraintValidator<ValidUsername, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }

        String username = value.trim();

        if (Forbidden67Policy.containsForbiddenToken(username)) {
            setMessage(context, Forbidden67Policy.DEFAULT_MESSAGE);
            return false;
        }

        if (!InputValidationPolicy.isValidUsername(username)) {
            setMessage(context, InputValidationPolicy.USERNAME_MESSAGE);
            return false;
        }

        return true;
    }

    private void setMessage(ConstraintValidatorContext context, String message) {
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate(message)
                .addConstraintViolation();
    }
}
