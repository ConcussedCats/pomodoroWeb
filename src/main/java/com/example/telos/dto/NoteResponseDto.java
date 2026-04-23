package com.example.telos.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
public class NoteResponseDto {
    private Long noteId;
    private String noteText;
    private LocalDateTime createdAt;
    private String message;
}
