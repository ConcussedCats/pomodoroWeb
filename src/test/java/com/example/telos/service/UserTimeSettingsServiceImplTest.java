package com.example.telos.service;

import com.example.telos.dto.UserTimeSettingsDto;
import com.example.telos.dto.UserTimeSettingsResponseDto;
import com.example.telos.exception.NullEntityReferenceException;
import com.example.telos.model.User;
import com.example.telos.model.UserTimeSettings;
import com.example.telos.repository.UserTimeSettingsRepository;
import com.example.telos.service.impl.UserTimeSettingsServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserTimeSettingsServiceImplTest {

    @Mock
    private UserTimeSettingsRepository userTimeSettingsRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserTimeSettingsServiceImpl userTimeSettingsService;

    @Test
    void shouldReturnSettingsForExistingUser() {
        User user = buildUser(1L, "user@test.com");
        UserTimeSettings settings = buildSettings(10L, user, 25, 5, 15, 4, true);

        when(userService.findByEmailOrUsername("user@test.com")).thenReturn(user);
        when(userService.findById(1L)).thenReturn(user);
        when(userTimeSettingsRepository.findByUser(user)).thenReturn(Optional.of(settings));

        UserTimeSettingsResponseDto response = userTimeSettingsService.findSettings("user@test.com");

        assertEquals(25, response.getPomodoroMinutes());
        assertEquals(5, response.getShortBreakMinutes());
        assertEquals(15, response.getLongBreakMinutes());
        assertEquals(4, response.getPomoCycles());
        assertEquals(true, response.isSoundsEnabled());
        assertEquals("UserTimeSettings found", response.getMessage());
    }

    @Test
    void shouldUpdateAndPersistAllSettingsFields() {
        User user = buildUser(1L, "user@test.com");
        UserTimeSettings settings = buildSettings(10L, user, 25, 5, 15, 4, true);
        UserTimeSettingsDto dto = new UserTimeSettingsDto();
        dto.setPomodoroMinutes(35);
        dto.setShortBreakMinutes(10);
        dto.setLongBreakMinutes(20);
        dto.setPomoCycles(2);
        dto.setSoundsEnabled(false);

        when(userService.findByEmailOrUsername("user@test.com")).thenReturn(user);
        when(userService.findById(1L)).thenReturn(user);
        when(userTimeSettingsRepository.findByUser(user)).thenReturn(Optional.of(settings));
        when(userTimeSettingsRepository.save(settings)).thenReturn(settings);

        UserTimeSettingsResponseDto response = userTimeSettingsService.updateSettings("user@test.com", dto);

        assertEquals(35, settings.getPomodoroMinutes());
        assertEquals(10, settings.getShortBreakMinutes());
        assertEquals(20, settings.getLongBreakMinutes());
        assertEquals(2, settings.getPomoCycles());
        assertFalse(settings.getSoundsEnable());
        assertEquals("UserTimeSettings updated", response.getMessage());
        verify(userTimeSettingsRepository).save(settings);
    }

    @Test
    void shouldRejectFindByUserWhenUserIsNull() {
        NullEntityReferenceException exception = assertThrows(
                NullEntityReferenceException.class,
                () -> userTimeSettingsService.findByUser(null)
        );

        assertEquals("User is null", exception.getMessage());
    }

    @Test
    void shouldRejectUpdateSettingsWhenUserHasNoId() {
        User user = buildUser(null, "user@test.com");
        UserTimeSettingsDto dto = new UserTimeSettingsDto();
        dto.setPomodoroMinutes(25);
        dto.setShortBreakMinutes(5);
        dto.setLongBreakMinutes(15);
        dto.setPomoCycles(4);
        dto.setSoundsEnabled(true);

        when(userService.findByEmailOrUsername("user@test.com")).thenReturn(user);

        NullEntityReferenceException exception = assertThrows(
                NullEntityReferenceException.class,
                () -> userTimeSettingsService.updateSettings("user@test.com", dto)
        );

        assertEquals("User id is null", exception.getMessage());
    }

    private User buildUser(Long id, String email) {
        User user = new User();
        ReflectionTestUtils.setField(user, "userId", id);
        user.setEmail(email);
        user.setUsername("demo-user");
        return user;
    }

    private UserTimeSettings buildSettings(Long id, User user, int pomodoro, int shortBreak, int longBreak, int cycles, boolean soundsEnabled) {
        UserTimeSettings settings = new UserTimeSettings();
        ReflectionTestUtils.setField(settings, "settingsId", id);
        ReflectionTestUtils.setField(settings, "user", user);
        settings.setPomodoroMinutes(pomodoro);
        settings.setShortBreakMinutes(shortBreak);
        settings.setLongBreakMinutes(longBreak);
        settings.setPomoCycles(cycles);
        settings.setSoundsEnable(soundsEnabled);
        return settings;
    }
}
