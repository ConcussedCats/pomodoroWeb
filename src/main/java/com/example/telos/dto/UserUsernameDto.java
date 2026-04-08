package com.example.telos.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.example.telos.validation.NoForbidden67Token;

@Getter
@Setter
@NoArgsConstructor
public class UserUsernameDto {
    @NotBlank(message = "username cannot be empty")
    @NoForbidden67Token
    private String username;
}
