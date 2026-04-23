package com.example.telos.controller.api.jwt;

import com.example.telos.dto.AuthRequest;
import com.example.telos.dto.AuthResponse;
import com.example.telos.model.User;
import com.example.telos.security.JwtService;
import com.example.telos.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/jwt/auth")
@AllArgsConstructor
public class AuthJwtController { // test

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserService userService;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest authRequest) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        authRequest.getLogin(),
                        authRequest.getPassword()
                )
        );

        User user = userService.findByEmailOrUsername(authRequest.getLogin());

        return new AuthResponse(jwtService.generateToken(user.getEmail()));
    }
}
