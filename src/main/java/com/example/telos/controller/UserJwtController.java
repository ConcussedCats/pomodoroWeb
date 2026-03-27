package com.example.telos.controller;


import com.example.telos.dto.UserPasswordDto;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserUsernameDto;
import com.example.telos.dto.UserUsernameResponseDto;
import com.example.telos.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@AllArgsConstructor
@RequestMapping("/api/jwt/user")
@RestController
public class UserJwtController {
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
