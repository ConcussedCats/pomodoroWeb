package com.example.telos.api;

import com.example.telos.controller.api.session.UserRestController;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserUsernameResponseDto;
import com.example.telos.exception.RestExceptionHandler;
import com.example.telos.exception.UsernameAlreadyTakenException;
import com.example.telos.security.RestAccessDeniedHandler;
import com.example.telos.security.RestAuthenticationEntryPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserRestController.class)
@Import({
        RestExceptionHandler.class,
        RestAuthenticationEntryPoint.class,
        RestAccessDeniedHandler.class,
        SessionApiWebMvcTestConfig.class
})
@Tag("contract")
class UserRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SessionApiWebMvcTestConfig.StubUserService userService;

    @BeforeEach
    void setUp() {
        userService.reset();
    }

    @Test
    void shouldReturnJsonUnauthorizedForAnonymousUsernameUpdate() throws Exception {
        mockMvc.perform(patch("/api/user/username")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "new-name"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.path").value("/api/user/username"))
                .andExpect(jsonPath("$.method").value("PATCH"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldUpdateUsernameForAuthenticatedUser() throws Exception {
        userService.nextUsernameResponse = new UserUsernameResponseDto("new-name", "Username updated");

        mockMvc.perform(patch("/api/user/username")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "new-name"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("new-name"))
                .andExpect(jsonPath("$.message").value("Username updated"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldRejectBlankUsername() throws Exception {
        mockMvc.perform(patch("/api/user/username")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "   "
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("username cannot be empty"))
                .andExpect(jsonPath("$.path").value("/api/user/username"))
                .andExpect(jsonPath("$.method").value("PATCH"))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldReturnConflictWhenUsernameAlreadyExists() throws Exception {
        userService.usernameException = new UsernameAlreadyTakenException("Username is already taken");

        mockMvc.perform(patch("/api/user/username")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "taken-name"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value("Username is already taken"))
                .andExpect(jsonPath("$.path").value("/api/user/username"))
                .andExpect(jsonPath("$.method").value("PATCH"))
                .andExpect(jsonPath("$.errorCode").value("USERNAME_CONFLICT"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldRejectUsernameUpdateWithoutCsrf() throws Exception {
        mockMvc.perform(patch("/api/user/username")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "new-name"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectForbidden67Username() throws Exception {
        mockMvc.perform(patch("/api/user/username")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": " SIX   seven "
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("67 and six seven are not allowed here"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectMalformedUsernameBody() throws Exception {
        mockMvc.perform(patch("/api/user/username")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MALFORMED_BODY"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectUnsupportedMethodForUsernameEndpoint() throws Exception {
        mockMvc.perform(post("/api/user/username")
                        .with(csrf()))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldUpdatePasswordForAuthenticatedUser() throws Exception {
        userService.nextPasswordResponse = new UserPasswordResponseDto("Password updated");

        mockMvc.perform(patch("/api/user/password")
                        .with(csrf())
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
    @WithMockUser(username = "user@test.com")
    void shouldRejectBlankPasswordFields() throws Exception {
        mockMvc.perform(patch("/api/user/password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "oldPassword": "",
                                  "newPassword": "Validpass1",
                                  "confirmNewPassword": "Validpass1"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("oldPassword cannot be empty"))
                .andExpect(jsonPath("$.path").value("/api/user/password"))
                .andExpect(jsonPath("$.method").value("PATCH"))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    @Tag("negative")
    @WithMockUser(username = "user@test.com")
    void shouldRejectShortNewPasswordAtValidationLayer() throws Exception {
        mockMvc.perform(patch("/api/user/password")
                        .with(csrf())
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
    @WithMockUser(username = "user@test.com")
    void shouldReturnBadRequestWhenPasswordUpdateFailsBusinessValidation() throws Exception {
        userService.passwordException = new IllegalArgumentException("New passwords do not match");

        mockMvc.perform(patch("/api/user/password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "oldPassword": "current-password",
                                  "newPassword": "Validpass1",
                                  "confirmNewPassword": "Different1"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("New passwords do not match"))
                .andExpect(jsonPath("$.path").value("/api/user/password"))
                .andExpect(jsonPath("$.method").value("PATCH"))
                .andExpect(jsonPath("$.errorCode").value("INVALID_ARGUMENT"));
    }

    @Test
    @WithMockUser(username = "user@test.com")
    void shouldRejectPasswordUpdateWithoutCsrf() throws Exception {
        mockMvc.perform(patch("/api/user/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "oldPassword": "current-password",
                                  "newPassword": "new-password-123",
                                  "confirmNewPassword": "new-password-123"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }
}
