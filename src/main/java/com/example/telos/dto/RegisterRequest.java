package com.example.telos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "username cannot be empty")
    private String username;

    @NotBlank(message = "email cannot be empty")
    @Email(message = "email must be valid")
    private String email;

    @NotBlank(message = "password cannot be empty")
    private String password;

    @NotBlank(message = "confirmPassword cannot be empty")
    private String confirmPassword;
}
