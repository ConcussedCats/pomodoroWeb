package com.example.telos.dto;

import com.example.telos.model.Priority;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;


@Getter
@Setter
@NoArgsConstructor
public class ToDoDto {
    private String title;
    private String description;
    private Boolean isDone;
    private Priority priority;
    private LocalDateTime deadline;
}
