package com.example.telos.controllerTests;

import com.example.telos.controller.page.RegisterController;
import com.example.telos.exception.UsernameAlreadyTakenException;
import com.example.telos.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

public class RegisterControllerTest {

    private final UserService userService = mock(UserService.class);
    private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
    private final MockMvc mockMvc = MockMvcTestUtils.standalone(new RegisterController(userService, authenticationManager));

    @Test
    void shouldReturnRegisterPage() throws Exception {
        mockMvc.perform(get("/register"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"));
    }

    @Test
    void shouldRejectBlankUsernameOnRegisterSubmit() throws Exception {
        mockMvc.perform(post("/register")
                        .param("username", "   ")
                        .param("email", "user@test.com")
                        .param("password", "Validpass1")
                        .param("confirmPassword", "Validpass1"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(model().attribute("error", "username cannot be empty"))
                .andExpect(model().attribute("email", "user@test.com"))
                .andExpect(model().attribute("username", "   "));

        verifyNoInteractions(userService, authenticationManager);
    }

    @Test
    void shouldRejectInvalidEmailOnRegisterSubmit() throws Exception {
        mockMvc.perform(post("/register")
                        .param("username", "demo-user")
                        .param("email", "not-an-email")
                        .param("password", "Validpass1")
                        .param("confirmPassword", "Validpass1"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(model().attribute("error", "email must be valid"))
                .andExpect(model().attribute("email", "not-an-email"))
                .andExpect(model().attribute("username", "demo-user"));

        verifyNoInteractions(userService, authenticationManager);
    }

    @Test
    void shouldRejectBlankPasswordOnRegisterSubmit() throws Exception {
        mockMvc.perform(post("/register")
                        .param("username", "demo-user")
                        .param("email", "user@test.com")
                        .param("password", "   ")
                        .param("confirmPassword", "Validpass1"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(model().attribute("error", "password cannot be empty"))
                .andExpect(model().attribute("email", "user@test.com"))
                .andExpect(model().attribute("username", "demo-user"));

        verifyNoInteractions(userService, authenticationManager);
    }

    @Test
    void shouldStayOnRegisterPageWhenPasswordsDoNotMatch() throws Exception {
        when(userService.register(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new IllegalArgumentException("Password and confirm password don't match"));

        mockMvc.perform(post("/register")
                        .param("username", "demo-user")
                        .param("email", "user@test.com")
                        .param("password", "Validpass1")
                        .param("confirmPassword", "Different1"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(model().attribute("error", "Password and confirm password don't match"))
                .andExpect(model().attribute("email", "user@test.com"))
                .andExpect(model().attribute("username", "demo-user"));

        verifyNoInteractions(authenticationManager);
    }

    @Test
    void shouldStayOnRegisterPageWhenUsernameIsTaken() throws Exception {
        when(userService.register(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new UsernameAlreadyTakenException("Username is already taken"));

        mockMvc.perform(post("/register")
                        .param("username", "taken-user")
                        .param("email", "new-user@test.com")
                        .param("password", "Validpass1")
                        .param("confirmPassword", "Validpass1"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(model().attribute("error", "Username is already taken"))
                .andExpect(model().attribute("email", "new-user@test.com"))
                .andExpect(model().attribute("username", "taken-user"));

        verifyNoInteractions(authenticationManager);
    }

    @Test
    void shouldStayOnRegisterPageWhenEmailIsTaken() throws Exception {
        when(userService.register(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new IllegalArgumentException("Email is already taken"));

        mockMvc.perform(post("/register")
                        .param("username", "new-user")
                        .param("email", "user@test.com")
                        .param("password", "Validpass1")
                        .param("confirmPassword", "Validpass1"))
                .andExpect(status().isOk())
                .andExpect(view().name("register"))
                .andExpect(model().attribute("error", "Email is already taken"))
                .andExpect(model().attribute("email", "user@test.com"))
                .andExpect(model().attribute("username", "new-user"));

        verifyNoInteractions(authenticationManager);
    }
}
