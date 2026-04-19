package com.example.telos.validation;

public class InputValidationPolicy {
    public static final String USERNAME_PATTERN = "^[A-Za-z0-9_-]{3,30}$";
    public static final String USERNAME_MESSAGE = "username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens";

    public static final String PASSWORD_PATTERN = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$";
    public static final String PASSWORD_MESSAGE = "password must be at least 8 characters and include uppercase, lowercase, and a number";

    private InputValidationPolicy() {
    }

    public static boolean isValidUsername(String value) {
        return value != null && value.matches(USERNAME_PATTERN);
    }

    public static boolean isValidPassword(String value) {
        return value != null && value.matches(PASSWORD_PATTERN);
    }
}
