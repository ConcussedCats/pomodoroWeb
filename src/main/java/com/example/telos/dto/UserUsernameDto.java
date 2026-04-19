package com.example.telos.dto;

import com.example.telos.validation.ValidUsername;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserUsernameDto {
    @NotBlank(message = "username cannot be empty")
    @ValidUsername
    private String username;
}
