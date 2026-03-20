package com.example.telos.controller;

import com.example.telos.dto.UserPasswordDto;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserUsernameDto;
import com.example.telos.dto.UserUsernameResponseDto;
import com.example.telos.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@AllArgsConstructor
@RestController
@RequestMapping("/api/user")
public class UserRestController {
    private final UserService userService;

    @PatchMapping("/username")
    public UserUsernameResponseDto updateUsername(Principal principal, @Valid @RequestBody UserUsernameDto userUsernameDto) {
        return userService.updateUsername(principal.getName(), userUsernameDto.getUsername());
    }

    @PatchMapping("/password")
    public UserPasswordResponseDto updatePassword(Principal principal, @Valid @RequestBody UserPasswordDto userPasswordDto) {
        return userService.updatePassword(principal.getName(), userPasswordDto);
    }
}
