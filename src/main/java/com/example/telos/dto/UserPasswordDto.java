package com.example.telos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserPasswordDto {

    @NotBlank(message = "oldPassword cannot be empty")
    private String oldPassword;

    @NotBlank(message = "newPassword cannot be empty")
    @Size(min = 8, message = "newPassword must be at least 8 characters")
    private String newPassword;

    @NotBlank(message = "confirmPassword cannot be empty")
    private String confirmNewPassword;
}
