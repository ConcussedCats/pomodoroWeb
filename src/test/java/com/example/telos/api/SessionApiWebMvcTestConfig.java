package com.example.telos.api;

import com.example.telos.dto.UserPasswordDto;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserTimeSettingsDto;
import com.example.telos.dto.UserTimeSettingsResponseDto;
import com.example.telos.dto.UserUsernameResponseDto;
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
}
