package com.example.telos.api;

import com.example.telos.security.JwtFilter;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Base64;
import java.util.List;

@TestConfiguration
class JwtApiWebMvcTestConfig {

    @Bean
    SecurityFilterChain jwtApiSecurityFilterChain(HttpSecurity http,
                                                  JwtFilter jwtFilter,
                                                  RestAuthenticationEntryPoint restAuthenticationEntryPoint,
                                                  RestAccessDeniedHandler restAccessDeniedHandler) throws Exception {
        http
                .securityMatcher("/api/jwt/**")
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/jwt/auth/**").permitAll()
                        .anyRequest().authenticated()
                )
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler)
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    LogErrorService logErrorService() {
        return new NoOpLogErrorService();
    }

    @Bean
    SessionApiWebMvcTestConfig.StubUserService stubUserService() {
        return new SessionApiWebMvcTestConfig.StubUserService();
    }

    @Bean
    UserService userService(SessionApiWebMvcTestConfig.StubUserService stubUserService) {
        return stubUserService;
    }

    @Bean
    SessionApiWebMvcTestConfig.StubUserTimeSettingsService stubUserTimeSettingsService() {
        return new SessionApiWebMvcTestConfig.StubUserTimeSettingsService();
    }

    @Bean
    UserTimeSettingsService userTimeSettingsService(SessionApiWebMvcTestConfig.StubUserTimeSettingsService stubUserTimeSettingsService) {
        return stubUserTimeSettingsService;
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
    AuthenticationManager authenticationManager() {
        return authentication -> {
            String login = String.valueOf(authentication.getPrincipal());
            String password = String.valueOf(authentication.getCredentials());

            if ("user@test.com".equals(login) && "test-password".equals(password)) {
                return new UsernamePasswordAuthenticationToken(
                        login,
                        password,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                );
            }

            throw new BadCredentialsException("Invalid login or password");
        };
    }

    static final class NoOpLogErrorService implements LogErrorService {
        @Override
        public void logWarn(HttpServletRequest request, HttpStatus httpStatus, Exception exception) {
        }

        @Override
        public void logError(HttpServletRequest request, HttpStatus httpStatus, Exception exception) {
        }
    }
}
