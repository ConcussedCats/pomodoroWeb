package com.example.telos.exception;

import lombok.NoArgsConstructor;

@NoArgsConstructor
public class NullEntityReferenceException extends RuntimeException {
    public NullEntityReferenceException(String message) {
        super(message);
    }
}
