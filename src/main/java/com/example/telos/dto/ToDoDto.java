package com.example.telos.dto;

import com.example.telos.model.Priority;
import com.example.telos.validation.NoForbidden67Token;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;


@Getter
@Setter
@NoArgsConstructor
public class ToDoDto {
    @NotBlank(message = "ToDo title cannot be empty")
    @Size(max = 25, message = "ToDo title cannot be longer than 25 characters")
    @Pattern(regexp = "^[^\\p{Cntrl}]+$", message = "ToDo title cannot contain line breaks or control characters")
    @NoForbidden67Token
    private String title;

    @Size(max = 1000, message = "Task description cannot be longer than 1000 characters")
    @NoForbidden67Token
    private String description;

    @NotNull(message = "Task completion status is required")
    private Boolean isDone;

    @NotNull(message = "Task priority is required")
    private Priority priority;

    @FutureOrPresent(message = "Deadline cannot be in the past")
    private LocalDateTime deadline;
}
