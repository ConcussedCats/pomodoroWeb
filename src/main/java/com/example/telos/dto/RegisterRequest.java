package com.example.telos.dto;

import com.example.telos.validation.InputValidationPolicy;
import com.example.telos.validation.ValidUsername;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "username cannot be empty")
    @ValidUsername
    private String username;

    @NotBlank(message = "email cannot be empty")
    @Email(message = "email must be valid")
    private String email;

    @NotBlank(message = "password cannot be empty")
    @Size(
            min = InputValidationPolicy.PASSWORD_MIN_LENGTH,
            max = InputValidationPolicy.PASSWORD_MAX_LENGTH,
            message = InputValidationPolicy.PASSWORD_MESSAGE
    )
    @Pattern(regexp = InputValidationPolicy.PASSWORD_PATTERN, message = InputValidationPolicy.PASSWORD_MESSAGE)
    private String password;

    @NotBlank(message = "confirmPassword cannot be empty")
    private String confirmPassword;
}
