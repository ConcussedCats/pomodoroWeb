package com.example.telos.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserTimeSettingsDto {
    @NotNull(message = "Work minutes is required")
    @Min(value = 1, message = "Work minutes must be at least 1 minute")
    @Max(value = 120, message = "Work minutes must be at most 120")
    private Integer pomodoroMinutes;

    @NotNull(message = "Short break minutes is required")
    @Min(value = 1, message = "Short break minutes must be at least 1 minute")
    @Max(value = 30, message = "Short break minutes must be at most 30")
    private Integer shortBreakMinutes;

    @NotNull(message = "Long break minutes is required")
    @Min(value = 1, message = "Long break minutes must be at least 1 minute")
    @Max(value = 80, message = "Long break minutes must be at most 80")
    private Integer longBreakMinutes;

    @NotNull(message = "Pomodoro cycles is required")
    @Min(value = 1, message = "Pomodoro cycles must be at least 1")
    @Max(value = 12, message = "Pomodoro cycles must be at most 12")
    private Integer pomoCycles;

    @NotNull(message = "Sounds enabled is required")
    private Boolean soundsEnabled;

    @NotNull(message = "Pattern type is required")
    @Pattern(regexp = "classic|compact", message = "Pattern type must be classic or compact")
    private String patternType;
}
