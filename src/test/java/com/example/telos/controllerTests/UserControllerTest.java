package com.example.telos.controllerTests;

import com.example.telos.controller.page.UserController;
import com.example.telos.dto.UserPasswordDto;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserUsernameResponseDto;
import com.example.telos.model.User;
import com.example.telos.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

public class UserControllerTest {

    private final MockMvc mockMvc = MockMvcTestUtils.standalone(new UserController(new StubUserService()));

    @Test
    void shouldReturnUserPage() throws Exception {
        mockMvc.perform(get("/user")
                        .principal((Principal) () -> "user@test.com"))
                .andExpect(status().isOk())
                .andExpect(view().name("user"));
    }

    private static final class StubUserService implements UserService {

        @Override
        public User findById(Long id) {
            return buildUser("user@test.com", "demo-user");
        }

        @Override
        public User findByEmail(String email) {
            return buildUser(email, "demo-user");
        }

        @Override
        public User findByUsername(String username) {
            return buildUser("user@test.com", username);
        }

        @Override
        public User create(User user) {
            return user;
        }

        @Override
        public User update(User newUser) {
            return newUser;
        }

        @Override
        public void delete(User user) {
        }

        @Override
        public User findByEmailOrUsername(String login) {
            return buildUser("user@test.com", "demo-user");
        }

        @Override
        public List<User> findAll() {
            return List.of(buildUser("user@test.com", "demo-user"));
        }

        @Override
        public UserUsernameResponseDto updateUsername(String login, String username) {
            return new UserUsernameResponseDto(username, "Username updated");
        }

        @Override
        public UserPasswordResponseDto updatePassword(String login, UserPasswordDto userPasswordDto) {
            return new UserPasswordResponseDto("Password updated");
        }

        private User buildUser(String email, String username) {
            User user = new User();
            user.setEmail(email);
            user.setUsername(username);
            user.setPassword("encoded-password");
            return user;
        }
    }
}
