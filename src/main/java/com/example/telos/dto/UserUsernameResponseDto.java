package com.example.telos.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class UserUsernameResponseDto {
    private String username;
    private String message;
}
