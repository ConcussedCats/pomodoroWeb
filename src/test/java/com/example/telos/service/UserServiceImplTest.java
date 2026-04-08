package com.example.telos.service;

import com.example.telos.dto.UserPasswordDto;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserUsernameResponseDto;
import com.example.telos.exception.NullEntityReferenceException;
import com.example.telos.exception.UsernameAlreadyTakenException;
import com.example.telos.model.User;
import com.example.telos.repository.UserRepository;
import com.example.telos.service.impl.UserServiceImpl;
import com.example.telos.validation.Forbidden67Policy;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@Tag("contract")
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void shouldTrimAndUpdateUsernameWhenValueIsAvailable() {
        User currentUser = buildUser(1L, "user@test.com", "user", "encoded-password");

        when(userRepository.findByUsername("new-name")).thenReturn(Optional.empty());
        when(userRepository.findByEmailOrUsername("user@test.com")).thenReturn(Optional.of(currentUser));
        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(userRepository.save(currentUser)).thenReturn(currentUser);

        UserUsernameResponseDto response = userService.updateUsername("user@test.com", "  new-name  ");

        assertEquals("new-name", currentUser.getUsername());
        assertEquals("new-name", response.getUsername());
        assertEquals("Username was successfully updated", response.getMessage());
        verify(userRepository).save(currentUser);
    }

    @Test
    void shouldRejectBlankUsername() {
        NullEntityReferenceException exception = assertThrows(
                NullEntityReferenceException.class,
                () -> userService.updateUsername("user@test.com", "   ")
        );

        assertEquals("Username cannot be empty", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldRejectUsernameWhenTakenByAnotherUser() {
        User currentUser = buildUser(1L, "user@test.com", "user", "encoded-password");
        User anotherUser = buildUser(2L, "guest@test.com", "taken-name", "encoded-password");

        when(userRepository.findByUsername("taken-name")).thenReturn(Optional.of(anotherUser));
        when(userRepository.findByEmailOrUsername("user@test.com")).thenReturn(Optional.of(currentUser));

        UsernameAlreadyTakenException exception = assertThrows(
                UsernameAlreadyTakenException.class,
                () -> userService.updateUsername("user@test.com", "taken-name")
        );

        assertEquals("Username is already taken", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    @Tag("negative")
    void shouldRejectForbidden67Username() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.updateUsername("user@test.com", " six   seven ")
        );

        assertEquals(Forbidden67Policy.DEFAULT_MESSAGE, exception.getMessage());
        verify(userRepository, never()).findByEmailOrUsername(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldEncodeAndUpdatePasswordWhenCurrentPasswordMatches() {
        User currentUser = buildUser(1L, "user@test.com", "user", "encoded-old-password");
        UserPasswordDto dto = new UserPasswordDto();
        dto.setOldPassword("old-password");
        dto.setNewPassword("new-password");
        dto.setConfirmNewPassword("new-password");

        when(userRepository.findByEmailOrUsername("user@test.com")).thenReturn(Optional.of(currentUser));
        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(passwordEncoder.matches("old-password", "encoded-old-password")).thenReturn(true);
        when(passwordEncoder.encode("new-password")).thenReturn("encoded-new-password");
        when(userRepository.save(currentUser)).thenReturn(currentUser);

        UserPasswordResponseDto response = userService.updatePassword("user@test.com", dto);

        assertEquals("encoded-new-password", currentUser.getPassword());
        assertEquals("New password was successfully updated", response.getMessage());
        verify(passwordEncoder).encode("new-password");
        verify(userRepository).save(currentUser);
    }

    @Test
    void shouldRejectPasswordUpdateWhenConfirmationDoesNotMatch() {
        UserPasswordDto dto = new UserPasswordDto();
        dto.setOldPassword("old-password");
        dto.setNewPassword("new-password");
        dto.setConfirmNewPassword("different-password");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.updatePassword("user@test.com", dto)
        );

        assertEquals("New password and confirm password don't match", exception.getMessage());
        verify(userRepository, never()).findByEmailOrUsername(any());
    }

    @Test
    @Tag("negative")
    void shouldRejectPasswordUpdateWhenNewPasswordIsTooShort() {
        UserPasswordDto dto = new UserPasswordDto();
        dto.setOldPassword("old-password");
        dto.setNewPassword("short");
        dto.setConfirmNewPassword("short");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.updatePassword("user@test.com", dto)
        );

        assertEquals("New password must be at least 8 characters", exception.getMessage());
        verify(userRepository, never()).findByEmailOrUsername(any());
    }

    @Test
    void shouldRejectPasswordUpdateWhenCurrentPasswordIsIncorrect() {
        User currentUser = buildUser(1L, "user@test.com", "user", "encoded-old-password");
        UserPasswordDto dto = new UserPasswordDto();
        dto.setOldPassword("wrong-old-password");
        dto.setNewPassword("new-password");
        dto.setConfirmNewPassword("new-password");

        when(userRepository.findByEmailOrUsername("user@test.com")).thenReturn(Optional.of(currentUser));
        when(passwordEncoder.matches("wrong-old-password", "encoded-old-password")).thenReturn(false);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> userService.updatePassword("user@test.com", dto)
        );

        assertEquals("Current password is incorrect", exception.getMessage());
        verify(passwordEncoder, never()).encode(any());
        verify(userRepository, never()).save(any());
    }

    private User buildUser(Long id, String email, String username, String password) {
        User user = new User();
        ReflectionTestUtils.setField(user, "userId", id);
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(password);
        return user;
    }
}
