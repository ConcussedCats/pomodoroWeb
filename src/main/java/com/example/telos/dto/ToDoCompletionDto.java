package com.example.telos.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ToDoCompletionDto {
    @NotNull(message = "Task completion status is required")
    private Boolean isDone;
}
