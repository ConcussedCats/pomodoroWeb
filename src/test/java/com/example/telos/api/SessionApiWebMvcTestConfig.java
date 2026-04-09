package com.example.telos.api;

import com.example.telos.dto.UserPasswordDto;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserTimeSettingsDto;
import com.example.telos.dto.UserTimeSettingsResponseDto;
import com.example.telos.dto.UserUsernameResponseDto;
import com.example.telos.dto.RegisterRequest;
import com.example.telos.dto.NoteDto;
import com.example.telos.dto.NoteResponseDto;
import com.example.telos.dto.ToDoDto;
import com.example.telos.dto.ToDoResponseDto;
import com.example.telos.model.Priority;
import com.example.telos.service.NoteService;
import com.example.telos.service.ToDoService;
import com.example.telos.model.User;
import com.example.telos.model.UserTimeSettings;
import com.example.telos.security.JwtService;
import com.example.telos.security.RestAccessDeniedHandler;
import com.example.telos.security.RestAuthenticationEntryPoint;
import com.example.telos.service.LogErrorService;
import com.example.telos.service.UserService;
import com.example.telos.service.UserTimeSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Base64;
import java.time.LocalDateTime;
import java.util.List;

@TestConfiguration
class SessionApiWebMvcTestConfig {

    @Bean
    SecurityFilterChain sessionApiSecurityFilterChain(HttpSecurity http,
                                                      RestAuthenticationEntryPoint restAuthenticationEntryPoint,
                                                      RestAccessDeniedHandler restAccessDeniedHandler) throws Exception {
        http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll()
                )
                .exceptionHandling(ex -> ex
                        .defaultAuthenticationEntryPointFor(
                                restAuthenticationEntryPoint,
                                request -> request.getRequestURI().startsWith("/api/")
                        )
                        .defaultAccessDeniedHandlerFor(
                                restAccessDeniedHandler,
                                request -> request.getRequestURI().startsWith("/api/")
                        )
                );

        return http.build();
    }

    @Bean
    LogErrorService logErrorService() {
        return new NoOpLogErrorService();
    }

    @Bean
    JwtService jwtService() {
        String secret = Base64.getEncoder()
                .encodeToString("01234567890123456789012345678901".getBytes());
        return new JwtService(secret, 3_600_000);
    }

    @Bean
    UserDetailsService userDetailsService() {
        return new InMemoryUserDetailsManager(
                org.springframework.security.core.userdetails.User.withUsername("user@test.com")
                        .password("{noop}test-password")
                        .roles("USER")
                        .build()
        );
    }

    @Bean
    StubUserService stubUserService() {
        return new StubUserService();
    }

    @Bean
    UserService userService(StubUserService stubUserService) {
        return stubUserService;
    }

    @Bean
    StubUserTimeSettingsService stubUserTimeSettingsService() {
        return new StubUserTimeSettingsService();
    }

    @Bean
    UserTimeSettingsService userTimeSettingsService(StubUserTimeSettingsService stubUserTimeSettingsService) {
        return stubUserTimeSettingsService;
    }

    @Bean
    StubToDoService stubToDoService() {
        return new StubToDoService();
    }

    @Bean
    ToDoService toDoService(StubToDoService stubToDoService) {
        return stubToDoService;
    }

    @Bean
    StubNoteService stubNoteService() {
        return new StubNoteService();
    }

    @Bean
    NoteService noteService(StubNoteService stubNoteService) {
        return stubNoteService;
    }

    static final class NoOpLogErrorService implements LogErrorService {
        @Override
        public void logWarn(HttpServletRequest request, HttpStatus httpStatus, Exception exception) {
        }

        @Override
        public void logError(HttpServletRequest request, HttpStatus httpStatus, Exception exception) {
        }
    }

    static final class StubUserService implements UserService {
        UserUsernameResponseDto nextUsernameResponse = new UserUsernameResponseDto("default-user", "Username updated");
        UserPasswordResponseDto nextPasswordResponse = new UserPasswordResponseDto("Password updated");
        User lookupUser;
        RuntimeException usernameException;
        RuntimeException passwordException;

        void reset() {
            nextUsernameResponse = new UserUsernameResponseDto("default-user", "Username updated");
            nextPasswordResponse = new UserPasswordResponseDto("Password updated");
            lookupUser = null;
            usernameException = null;
            passwordException = null;
        }

        @Override
        public User findById(Long id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public User findByEmail(String email) {
            throw new UnsupportedOperationException();
        }

        @Override
        public User findByUsername(String username) {
            throw new UnsupportedOperationException();
        }

        @Override
        public User register(RegisterRequest registerRequest) {
            throw new UnsupportedOperationException();
        }

        @Override
        public User create(User user) {
            throw new UnsupportedOperationException();
        }

        @Override
        public User update(User newUser) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void delete(User user) {
            throw new UnsupportedOperationException();
        }

        @Override
        public User findByEmailOrUsername(String login) {
            if (lookupUser != null) {
                return lookupUser;
            }
            throw new UnsupportedOperationException();
        }

        @Override
        public List<User> findAll() {
            throw new UnsupportedOperationException();
        }

        @Override
        public UserUsernameResponseDto updateUsername(String login, String username) {
            if (usernameException != null) {
                throw usernameException;
            }
            return nextUsernameResponse;
        }

        @Override
        public UserPasswordResponseDto updatePassword(String login, UserPasswordDto userPasswordDto) {
            if (passwordException != null) {
                throw passwordException;
            }
            return nextPasswordResponse;
        }
    }

    static final class StubUserTimeSettingsService implements UserTimeSettingsService {
        UserTimeSettingsResponseDto nextFindSettingsResponse =
                new UserTimeSettingsResponseDto(25, 5, 15, 4, true, "Settings loaded");
        UserTimeSettingsResponseDto nextUpdateSettingsResponse =
                new UserTimeSettingsResponseDto(30, 7, 20, 3, false, "Settings updated");
        RuntimeException findException;
        RuntimeException updateException;

        void reset() {
            nextFindSettingsResponse = new UserTimeSettingsResponseDto(25, 5, 15, 4, true, "Settings loaded");
            nextUpdateSettingsResponse = new UserTimeSettingsResponseDto(30, 7, 20, 3, false, "Settings updated");
            findException = null;
            updateException = null;
        }

        @Override
        public UserTimeSettings findById(Long userTimeSettingsId) {
            throw new UnsupportedOperationException();
        }

        @Override
        public UserTimeSettings create(UserTimeSettings userTimeSettings) {
            throw new UnsupportedOperationException();
        }

        @Override
        public UserTimeSettings update(UserTimeSettings newUserTimeSettings) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void delete(UserTimeSettings userTimeSettings) {
            throw new UnsupportedOperationException();
        }

        @Override
        public UserTimeSettings findByUser(User user) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<UserTimeSettings> findAll() {
            throw new UnsupportedOperationException();
        }

        @Override
        public UserTimeSettingsResponseDto updateSettings(String login, UserTimeSettingsDto userTimeSettingsDto) {
            if (updateException != null) {
                throw updateException;
            }
            return nextUpdateSettingsResponse;
        }

        @Override
        public UserTimeSettingsResponseDto findSettings(String login) {
            if (findException != null) {
                throw findException;
            }
            return nextFindSettingsResponse;
        }
    }

    static final class StubToDoService implements ToDoService {
        List<ToDoResponseDto> nextToDos = List.of(defaultTodoResponse(null));
        ToDoResponseDto nextCreateResponse = defaultTodoResponse("Task was created successfully");
        ToDoResponseDto nextUpdateResponse = defaultTodoResponse("Task was updated successfully");
        RuntimeException listException;
        RuntimeException createException;
        RuntimeException updateException;
        RuntimeException deleteException;

        void reset() {
            nextToDos = List.of(defaultTodoResponse(null));
            nextCreateResponse = defaultTodoResponse("Task was created successfully");
            nextUpdateResponse = defaultTodoResponse("Task was updated successfully");
            listException = null;
            createException = null;
            updateException = null;
            deleteException = null;
        }

        private static ToDoResponseDto defaultTodoResponse(String message) {
            ToDoResponseDto dto = new ToDoResponseDto();
            dto.setTodoId(1L);
            dto.setTitle("Default task");
            dto.setDescription("Default description");
            dto.setIsDone(false);
            dto.setPriority(Priority.LOW);
            dto.setDeadline(LocalDateTime.of(2099, 1, 1, 10, 0));
            dto.setCreatedAt(LocalDateTime.of(2099, 1, 1, 9, 0));
            dto.setMessage(message);
            return dto;
        }

        @Override
        public com.example.telos.model.ToDo findById(long id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public com.example.telos.model.ToDo create(com.example.telos.model.ToDo toDo) {
            throw new UnsupportedOperationException();
        }

        @Override
        public com.example.telos.model.ToDo update(com.example.telos.model.ToDo toDo) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<com.example.telos.model.ToDo> findAllByUser(User user) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<ToDoResponseDto> getUserToDos(String login) {
            if (listException != null) {
                throw listException;
            }
            return nextToDos;
        }

        @Override
        public ToDoResponseDto createNewToDo(String login, ToDoDto toDoDto) {
            if (createException != null) {
                throw createException;
            }
            return nextCreateResponse;
        }

        @Override
        public ToDoResponseDto updateToDo(String login, long todoId, ToDoDto toDoDto) {
            if (updateException != null) {
                throw updateException;
            }
            return nextUpdateResponse;
        }

        @Override
        public void deleteToDo(String login, long id) {
            if (deleteException != null) {
                throw deleteException;
            }
        }

        @Override
        public void delete(com.example.telos.model.ToDo toDo) {
            throw new UnsupportedOperationException();
        }
    }

    static final class StubNoteService implements NoteService {
        List<NoteResponseDto> nextNotes = List.of(new NoteResponseDto(1L, "Default note", null));
        NoteResponseDto nextCreateResponse = new NoteResponseDto(2L, "Created note", "Note was created successfully");
        NoteResponseDto nextUpdateResponse = new NoteResponseDto(2L, "Updated note", "Note was updated successfully");
        RuntimeException listException;
        RuntimeException createException;
        RuntimeException updateException;
        RuntimeException deleteException;

        void reset() {
            nextNotes = List.of(new NoteResponseDto(1L, "Default note", null));
            nextCreateResponse = new NoteResponseDto(2L, "Created note", "Note was created successfully");
            nextUpdateResponse = new NoteResponseDto(2L, "Updated note", "Note was updated successfully");
            listException = null;
            createException = null;
            updateException = null;
            deleteException = null;
        }

        @Override
        public com.example.telos.model.Note findById(long id) {
            throw new UnsupportedOperationException();
        }

        @Override
        public com.example.telos.model.Note create(com.example.telos.model.Note note) {
            throw new UnsupportedOperationException();
        }

        @Override
        public com.example.telos.model.Note update(com.example.telos.model.Note note) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<com.example.telos.model.Note> findAllByUser(User user) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<NoteResponseDto> getUserNotes(String login) {
            if (listException != null) {
                throw listException;
            }
            return nextNotes;
        }

        @Override
        public NoteResponseDto updateNote(String login, long noteId, NoteDto noteDto) {
            if (updateException != null) {
                throw updateException;
            }
            return nextUpdateResponse;
        }

        @Override
        public NoteResponseDto createNewNote(String login, NoteDto noteDto) {
            if (createException != null) {
                throw createException;
            }
            return nextCreateResponse;
        }

        @Override
        public void deleteNote(String login, long id) {
            if (deleteException != null) {
                throw deleteException;
            }
        }

        @Override
        public void delete(com.example.telos.model.Note note) {
            throw new UnsupportedOperationException();
        }
    }
}
