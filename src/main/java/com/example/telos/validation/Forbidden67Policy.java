package com.example.telos.validation;

public class Forbidden67Policy {

    public static final String DEFAULT_MESSAGE = "67 and six seven are not allowed here";

    private Forbidden67Policy() {
    }

    public static boolean containsForbiddenToken(String value) {
        if (value == null) {
            return false;
        }

        String normalized = value.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase();

        return "67".equals(normalized) || "six seven".equals(normalized);
    }
}
