package com.example.telos.dto;

import com.example.telos.validation.InputValidationPolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
    @Size(
            min = InputValidationPolicy.PASSWORD_MIN_LENGTH,
            max = InputValidationPolicy.PASSWORD_MAX_LENGTH,
            message = InputValidationPolicy.PASSWORD_MESSAGE
    )
    @Pattern(regexp = InputValidationPolicy.PASSWORD_PATTERN, message = InputValidationPolicy.PASSWORD_MESSAGE)
    private String newPassword;

    @NotBlank(message = "confirm password cannot be empty")
    private String confirmNewPassword;
}
