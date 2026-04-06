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
    @Size(max = 1200, message = "size the element must be lower or equal to 1200")
    private String noteText;
}
