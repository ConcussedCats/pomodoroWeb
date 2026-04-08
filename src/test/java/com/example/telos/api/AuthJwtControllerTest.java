package com.example.telos.api;

import com.example.telos.controller.api.jwt.AuthJwtController;
import com.example.telos.exception.RestExceptionHandler;
import com.example.telos.model.User;
import com.example.telos.security.JwtFilter;
import com.example.telos.security.JwtService;
import com.example.telos.security.RestAccessDeniedHandler;
import com.example.telos.security.RestAuthenticationEntryPoint;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthJwtController.class)
@Import({
        RestExceptionHandler.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class,
        JwtFilter.class,
        JwtApiWebMvcTestConfig.class
})
class AuthJwtControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SessionApiWebMvcTestConfig.StubUserService userService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userService.reset();

        User user = new User();
        user.setEmail("user@test.com");
        user.setUsername("demo-user");
        user.setPassword("encoded-password");
        userService.lookupUser = user;
    }

    @Test
    void shouldReturnJwtTokenForValidCredentials() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/jwt/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "login": "user@test.com",
                                  "password": "test-password"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andReturn();

        @SuppressWarnings("unchecked")
        Map<String, Object> body = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                Map.class
        );

        String token = String.valueOf(body.get("token"));
        if (!"user@test.com".equals(jwtService.extractLogin(token))) {
            throw new AssertionError("JWT token subject does not match expected user email");
        }
    }

    @Test
    void shouldReturnUnauthorizedForInvalidJwtLoginCredentials() throws Exception {
        mockMvc.perform(post("/api/jwt/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "login": "user@test.com",
                                  "password": "wrong-password"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid login or password"))
                .andExpect(jsonPath("$.path").value("/api/jwt/auth/login"))
                .andExpect(jsonPath("$.method").value("POST"))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }
}
