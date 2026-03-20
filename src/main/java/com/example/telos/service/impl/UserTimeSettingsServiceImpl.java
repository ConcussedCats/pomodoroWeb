package com.example.telos.service.impl;

import com.example.telos.dto.UserTimeSettingsDto;
import com.example.telos.dto.UserTimeSettingsResponseDto;
import com.example.telos.exception.NullEntityReferenceException;
import com.example.telos.model.User;
import com.example.telos.model.UserTimeSettings;
import com.example.telos.repository.UserTimeSettingsRepository;
import com.example.telos.service.UserService;
import com.example.telos.service.UserTimeSettingsService;
import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class UserTimeSettingsServiceImpl implements UserTimeSettingsService {
    private final UserTimeSettingsRepository userTimeSettingsRepository;
    private final UserService userService;

    @Override
    public UserTimeSettings findById(Long userTimeSettingsId) {
        return userTimeSettingsRepository.findById(userTimeSettingsId)
                .orElseThrow(() -> new EntityNotFoundException("UserTimeSettings not found with id: " + userTimeSettingsId));
    }

    @Override
    public UserTimeSettings create(UserTimeSettings userTimeSettings) {
        if (userTimeSettings == null) throw new NullEntityReferenceException("UserTimeSettings is null");
        return userTimeSettingsRepository.save(userTimeSettings);
    }

    @Override
    public UserTimeSettings update(UserTimeSettings newUserTimeSettings) {
        if (newUserTimeSettings == null) throw new NullEntityReferenceException("UserTimeSettings is null");
        if (newUserTimeSettings.getSettingsId() == null) throw new NullEntityReferenceException("UserTimeSettings id is null");
        findById(newUserTimeSettings.getSettingsId());
        return userTimeSettingsRepository.save(newUserTimeSettings);
    }

    @Override
    public void delete(UserTimeSettings userTimeSettings) {
        if (userTimeSettings == null) throw new NullEntityReferenceException("UserTimeSettings is null");
        if (userTimeSettings.getSettingsId() == null) throw new NullEntityReferenceException("UserTimeSettings id is null");
        findById(userTimeSettings.getSettingsId());
        userTimeSettingsRepository.delete(userTimeSettings);
    }

    @Override
    public UserTimeSettings findByUser(User user) {
        if (user == null) throw new NullEntityReferenceException("User is null");
        if (user.getUserId() == null) throw new NullEntityReferenceException("User id is null");
        userService.findById(user.getUserId());
        return userTimeSettingsRepository.findByUser(user).orElseThrow(() -> new EntityNotFoundException("UserTimeSettings not found with user id: " + user.getUserId()));
    }

    @Override
    public List<UserTimeSettings> findAll() {
        return userTimeSettingsRepository.findAll();
    }

    @Override
    public UserTimeSettingsResponseDto updateSettings(String login, UserTimeSettingsDto userTimeSettingsDto) {
        User user = userService.findByEmailOrUsername(login);
        if (user.getUserId() == null) throw new NullEntityReferenceException("User id is null");
        UserTimeSettings userTimeSettings = findByUser(user);
        userTimeSettings.setPomodoroMinutes(userTimeSettingsDto.getPomodoroMinutes());
        userTimeSettings.setShortBreakMinutes(userTimeSettingsDto.getShortBreakMinutes());
        userTimeSettings.setLongBreakMinutes(userTimeSettingsDto.getLongBreakMinutes());
        userTimeSettings.setPomoCycles(userTimeSettingsDto.getPomoCycles());
        userTimeSettings.setSoundsEnable(userTimeSettingsDto.isSoundsEnabled());
        userTimeSettingsRepository.save(userTimeSettings);
        return new UserTimeSettingsResponseDto(
                userTimeSettings.getPomodoroMinutes(),
                userTimeSettings.getShortBreakMinutes(),
                userTimeSettings.getLongBreakMinutes(),
                userTimeSettings.getPomoCycles(),
                userTimeSettings.getSoundsEnable(),
                "UserTimeSettings updated"
        );
    }

    @Override
    public UserTimeSettingsResponseDto findSettings(String login) {
        User user = userService.findByEmailOrUsername(login);
        if (user.getUserId() == null) throw new NullEntityReferenceException("User id is null");
        UserTimeSettings userTimeSettings = findByUser(user);
        return new UserTimeSettingsResponseDto(
                userTimeSettings.getPomodoroMinutes(),
                userTimeSettings.getShortBreakMinutes(),
                userTimeSettings.getLongBreakMinutes(),
                userTimeSettings.getPomoCycles(),
                userTimeSettings.getSoundsEnable(),
                "UserTimeSettings found"
        );
    }
}
