package com.example.telos.model;

public enum Priority {
    LOW, MEDIUM, HIGH;

    public static Priority getPriority(String priority) {
        if (priority == null) {
            throw new IllegalArgumentException("Priority value must not be null");
        }
        try {
            return Priority.valueOf(priority.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unrecognized priority value: " + priority, ex);
        }
    }
}
