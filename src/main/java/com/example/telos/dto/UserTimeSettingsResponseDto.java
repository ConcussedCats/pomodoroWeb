package com.example.telos.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class UserTimeSettingsResponseDto {
    private int pomodoroMinutes;
    private int shortBreakMinutes;
    private int longBreakMinutes;
    private int pomoCycles;
    private boolean soundsEnabled;
    private String message;
}
