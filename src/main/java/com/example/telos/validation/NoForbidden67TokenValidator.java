package com.example.telos.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class NoForbidden67TokenValidator implements ConstraintValidator<NoForbidden67Token, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return !Forbidden67Policy.containsForbiddenToken(value);
    }
}
