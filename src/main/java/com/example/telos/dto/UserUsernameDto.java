package com.example.telos.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserUsernameDto {
    @NotBlank(message = "username cannot be empty")
    private String username;
}
