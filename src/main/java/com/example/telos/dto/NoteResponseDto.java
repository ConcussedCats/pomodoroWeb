package com.example.telos.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class NoteResponseDto {
    private Long noteId;
    private String noteText;
    private String message;
}
