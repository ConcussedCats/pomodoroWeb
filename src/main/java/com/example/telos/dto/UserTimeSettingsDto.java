package com.example.telos.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserTimeSettingsDto {
    @Min(value = 1, message = "Work minutes must be at least 1 minute")
    @Max(value = 120, message = "Work minutes must be at most 120")
    private int pomodoroMinutes;

    @Min(value = 1, message = "Short break minutes must be at least 1 minute")
    @Max(value = 30, message = "Short break minutes must be at most 30")
    private int shortBreakMinutes;

    @Min(value = 1, message = "Long break minutes must be at least 1 minute")
    @Max(value = 80, message = "Long break minutes must be at most 80")
    private int longBreakMinutes;

    @Min(value = 1, message = "Pomodoro cycles must be at least 1")
    @Max(value = 12, message = "Pomodoro cycles must be at most 12")
    private int pomoCycles;
    private boolean soundsEnabled;
}
