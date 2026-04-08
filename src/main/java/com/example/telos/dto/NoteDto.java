package com.example.telos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class NoteDto {
    @NotBlank(message = "Note text cannot be empty")
    @Size(max = 1200, message = "Note text cannot be longer than 1200 characters")
    @NotBlank(message = "Note text cannot be empty")
    private String noteText;
}
