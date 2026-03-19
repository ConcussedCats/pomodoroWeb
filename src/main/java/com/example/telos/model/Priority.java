package com.example.telos.model;

public enum Priority {
    LOW, MEDIUM, HIGH;

    public static Priority getPriority(String priority) {
        return Priority.valueOf(priority.toUpperCase());
    }
}
