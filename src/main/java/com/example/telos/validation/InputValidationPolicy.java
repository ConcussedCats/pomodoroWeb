package com.example.telos.validation;

import java.util.regex.Pattern;

public class InputValidationPolicy {
    public static final String USERNAME_PATTERN = "^[A-Za-z0-9_-]{3,30}$";
    public static final String USERNAME_MESSAGE = "username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens";
    private static final Pattern USERNAME_REGEX = Pattern.compile(USERNAME_PATTERN);

    public static final int PASSWORD_MIN_LENGTH = 8;
    public static final int PASSWORD_MAX_LENGTH = 64;
    public static final String PASSWORD_PATTERN = "^(?=.*\\p{Ll})(?=.*\\p{Lu})(?=.*\\d).{8,64}$";
    public static final String PASSWORD_MESSAGE = "password must be 8-64 characters and include uppercase, lowercase, and a number";
    private static final Pattern PASSWORD_REGEX = Pattern.compile(PASSWORD_PATTERN);

    private InputValidationPolicy() {
    }

    public static boolean isValidUsername(String value) {
        return value != null && USERNAME_REGEX.matcher(value).matches();
    }

    public static boolean isValidPassword(String value) {
        return value != null && PASSWORD_REGEX.matcher(value).matches();
    }
}
