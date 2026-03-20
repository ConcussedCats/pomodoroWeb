package com.example.telos.controller;

import com.example.telos.dto.UserTimeSettingsDto;
import com.example.telos.dto.UserTimeSettingsResponseDto;
import com.example.telos.service.UserTimeSettingsService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@AllArgsConstructor
@RestController
@RequestMapping("/api/user/time-settings")
public class UserTimeSettingsRestController {
    private final UserTimeSettingsService userTimeSettingsService;

    @PatchMapping
    public UserTimeSettingsResponseDto updateTimeSettings(Principal principal, @Valid @RequestBody UserTimeSettingsDto userTimeSettingsDto) {
        return userTimeSettingsService.updateSettings(principal.getName(), userTimeSettingsDto);
    }

    @GetMapping
    public UserTimeSettingsResponseDto getTimeSettings(Principal principal) {
        return userTimeSettingsService.findSettings(principal.getName());
    }
}
