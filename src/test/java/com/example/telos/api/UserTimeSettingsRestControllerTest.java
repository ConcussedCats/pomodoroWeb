package com.example.telos.api;

import com.example.telos.controller.api.session.UserTimeSettingsRestController;
import com.example.telos.exception.RestExceptionHandler;
import com.example.telos.security.RestAccessDeniedHandler;
import com.example.telos.security.RestAuthenticationEntryPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserTimeSettingsRestController.class)
@Import({
        RestExceptionHandler.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class,
        SessionApiWebMvcTestConfig.class
})
class UserTimeSettingsRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SessionApiWebMvcTestConfig.StubUserTimeSettingsService userTimeSettingsService;

    @BeforeEach
    void setUp() {
        userTimeSettingsService.reset();
    }

    @Test
    void shouldReturnJsonUnauthorizedForAnonymousGetTimeSettings() throws Exception {
        mockMvc.perform(get("/api/user/time-settings"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Authentication is required to access this resource"))
                .andExpect(jsonPath("$.path").value("/api/user/time-settings"))
                .andExpect(jsonPath("$.method").value("GET"))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldReturnTimeSettingsForAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/user/time-settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pomodoroMinutes").value(25))
                .andExpect(jsonPath("$.shortBreakMinutes").value(5))
                .andExpect(jsonPath("$.longBreakMinutes").value(15))
                .andExpect(jsonPath("$.pomoCycles").value(4))
                .andExpect(jsonPath("$.soundsEnabled").value(true))
                .andExpect(jsonPath("$.message").value("Settings loaded"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldUpdateTimeSettingsForAuthenticatedUser() throws Exception {
        mockMvc.perform(patch("/api/user/time-settings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pomodoroMinutes": 30,
                                  "shortBreakMinutes": 7,
                                  "longBreakMinutes": 20,
                                  "pomoCycles": 3,
                                  "soundsEnabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pomodoroMinutes").value(30))
                .andExpect(jsonPath("$.shortBreakMinutes").value(7))
                .andExpect(jsonPath("$.longBreakMinutes").value(20))
                .andExpect(jsonPath("$.pomoCycles").value(3))
                .andExpect(jsonPath("$.soundsEnabled").value(false))
                .andExpect(jsonPath("$.message").value("Settings updated"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldRejectTimeSettingsUpdateWithoutCsrf() throws Exception {
        mockMvc.perform(patch("/api/user/time-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pomodoroMinutes": 30,
                                  "shortBreakMinutes": 7,
                                  "longBreakMinutes": 20,
                                  "pomoCycles": 3,
                                  "soundsEnabled": false
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("You do not have permission to perform this action"))
                .andExpect(jsonPath("$.path").value("/api/user/time-settings"))
                .andExpect(jsonPath("$.method").value("PATCH"))
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldRejectInvalidTimeSettingsPayload() throws Exception {
        mockMvc.perform(patch("/api/user/time-settings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pomodoroMinutes": 0,
                                  "shortBreakMinutes": 7,
                                  "longBreakMinutes": 20,
                                  "pomoCycles": 3,
                                  "soundsEnabled": false
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Work minutes must be at least 1 minute"))
                .andExpect(jsonPath("$.path").value("/api/user/time-settings"))
                .andExpect(jsonPath("$.method").value("PATCH"))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldRejectMalformedTimeSettingsBody() throws Exception {
        mockMvc.perform(patch("/api/user/time-settings")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pomodoroMinutes":
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Request body is missing or malformed"))
                .andExpect(jsonPath("$.path").value("/api/user/time-settings"))
                .andExpect(jsonPath("$.method").value("PATCH"))
                .andExpect(jsonPath("$.errorCode").value("MALFORMED_BODY"));
    }
}
