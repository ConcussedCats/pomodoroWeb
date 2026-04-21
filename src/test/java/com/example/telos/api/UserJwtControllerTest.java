package com.example.telos.api;

import com.example.telos.controller.api.jwt.UserJwtController;
import com.example.telos.controller.api.jwt.UserTimeSettingsJwtController;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserTimeSettingsResponseDto;
import com.example.telos.dto.UserUsernameResponseDto;
import com.example.telos.exception.RestExceptionHandler;
import com.example.telos.exception.UsernameAlreadyTakenException;
import com.example.telos.security.JwtFilter;
import com.example.telos.security.JwtService;
import com.example.telos.security.RestAccessDeniedHandler;
import com.example.telos.security.RestAuthenticationEntryPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({
        UserJwtController.class,
        UserTimeSettingsJwtController.class
})
@Import({
        RestExceptionHandler.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class,
        JwtFilter.class,
        JwtApiWebMvcTestConfig.class
})
@Tag("contract")
class UserJwtControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SessionApiWebMvcTestConfig.StubUserService userService;

    @Autowired
    private SessionApiWebMvcTestConfig.StubUserTimeSettingsService userTimeSettingsService;

    @Autowired
    private JwtService jwtService;

    private String bearerToken;

    @BeforeEach
    void setUp() {
        userService.reset();
        userTimeSettingsService.reset();
        userService.nextUsernameResponse = new UserUsernameResponseDto("jwt-user", "Username updated");
        userService.nextPasswordResponse = new UserPasswordResponseDto("Password updated");
        userTimeSettingsService.nextFindSettingsResponse =
                new UserTimeSettingsResponseDto(25, 5, 15, 4, true, "classic", "Settings loaded");
        userTimeSettingsService.nextUpdateSettingsResponse =
                new UserTimeSettingsResponseDto(35, 10, 25, 2, false, "compact", "Settings updated");
        bearerToken = "Bearer " + jwtService.generateToken("user@test.com");
    }

    @Test
    void shouldRejectAnonymousJwtUsernameUpdate() throws Exception {
        mockMvc.perform(patch("/api/jwt/user/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "jwt-user"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void shouldUpdateUsernameWithValidJwt() throws Exception {
        mockMvc.perform(patch("/api/jwt/user/username")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "jwt-user"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("jwt-user"))
                .andExpect(jsonPath("$.message").value("Username updated"));
    }

    @Test
    void shouldReturnConflictForJwtUsernameUpdate() throws Exception {
        userService.usernameException = new UsernameAlreadyTakenException("Username is already taken");

        mockMvc.perform(patch("/api/jwt/user/username")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "taken-name"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errorCode").value("USERNAME_CONFLICT"));
    }

    @Test
    @Tag("negative")
    void shouldRejectForbidden67JwtUsernameUpdate() throws Exception {
        mockMvc.perform(patch("/api/jwt/user/username")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "67"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("67 and six seven are not allowed here"));
    }

    @Test
    void shouldUpdatePasswordWithValidJwt() throws Exception {
        mockMvc.perform(patch("/api/jwt/user/password")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "oldPassword": "current-password",
                                  "newPassword": "Validpass1",
                                  "confirmNewPassword": "Validpass1"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated"));
    }

    @Test
    void shouldRejectInvalidJwtPasswordUpdate() throws Exception {
        userService.passwordException = new IllegalArgumentException("New passwords do not match");

        mockMvc.perform(patch("/api/jwt/user/password")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "oldPassword": "current-password",
                                  "newPassword": "Validpass1",
                                  "confirmNewPassword": "Differentpass1"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("INVALID_ARGUMENT"));
    }

    @Test
    @Tag("negative")
    void shouldRejectShortJwtPasswordAtValidationLayer() throws Exception {
        mockMvc.perform(patch("/api/jwt/user/password")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "oldPassword": "current-password",
                                  "newPassword": "short",
                                  "confirmNewPassword": "short"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("password must be 8-64 characters and include uppercase, lowercase, and a number"));
    }

    @Test
    void shouldReturnTimeSettingsWithValidJwt() throws Exception {
        mockMvc.perform(get("/api/jwt/user/time-settings")
                        .header("Authorization", bearerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pomodoroMinutes").value(25))
                .andExpect(jsonPath("$.patternType").value("classic"))
                .andExpect(jsonPath("$.message").value("Settings loaded"));
    }

    @Test
    void shouldUpdateTimeSettingsWithValidJwt() throws Exception {
        mockMvc.perform(patch("/api/jwt/user/time-settings")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pomodoroMinutes": 35,
                                  "shortBreakMinutes": 10,
                                  "longBreakMinutes": 25,
                                  "pomoCycles": 2,
                                  "soundsEnabled": false,
                                  "patternType": "compact"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pomodoroMinutes").value(35))
                .andExpect(jsonPath("$.soundsEnabled").value(false))
                .andExpect(jsonPath("$.patternType").value("compact"))
                .andExpect(jsonPath("$.message").value("Settings updated"));
    }

    @Test
    void shouldRejectInvalidJwtTimeSettingsPayload() throws Exception {
        mockMvc.perform(patch("/api/jwt/user/time-settings")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pomodoroMinutes": 0,
                                  "shortBreakMinutes": 10,
                                  "longBreakMinutes": 25,
                                  "pomoCycles": 2,
                                  "soundsEnabled": false,
                                  "patternType": "classic"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRejectInvalidJwtPatternType() throws Exception {
        mockMvc.perform(patch("/api/jwt/user/time-settings")
                        .header("Authorization", bearerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pomodoroMinutes": 35,
                                  "shortBreakMinutes": 10,
                                  "longBreakMinutes": 25,
                                  "pomoCycles": 2,
                                  "soundsEnabled": false,
                                  "patternType": "bad-value"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Pattern type must be classic or compact"));
    }

    @Test
    void shouldRejectInvalidJwtToken() throws Exception {
        mockMvc.perform(get("/api/jwt/user/time-settings")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    @Tag("negative")
    void shouldRejectUnsupportedMethodForJwtUsernameEndpoint() throws Exception {
        mockMvc.perform(post("/api/jwt/user/username")
                        .header("Authorization", bearerToken))
                .andExpect(status().isMethodNotAllowed());
    }
}
