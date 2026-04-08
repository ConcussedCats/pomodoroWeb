package com.example.telos.dto;

import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.NotBlank;
import com.example.telos.validation.NoForbidden67Token;

@Getter
@Setter
public class AuthRequest {
    @NotBlank(message = "login cannot be empty")
    @NoForbidden67Token
    private String login;

    @NotBlank(message = "password cannot be empty")
    private String password;
}
