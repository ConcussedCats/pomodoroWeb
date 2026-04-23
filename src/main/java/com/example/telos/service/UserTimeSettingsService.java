package com.example.telos.service;

import com.example.telos.dto.UserTimeSettingsDto;
import com.example.telos.dto.UserTimeSettingsResponseDto;
import com.example.telos.model.User;
import com.example.telos.model.UserTimeSettings;

import java.util.List;

public interface UserTimeSettingsService {
    UserTimeSettings findById(Long userTimeSettingsId);
    UserTimeSettings create(UserTimeSettings userTimeSettings);
    UserTimeSettings update(UserTimeSettings newUserTimeSettings);
    void delete(UserTimeSettings userTimeSettings);
    UserTimeSettings findByUser(User user);
    List<UserTimeSettings> findAll();
    UserTimeSettingsResponseDto updateSettings(String login, UserTimeSettingsDto userTimeSettingsDto);

    UserTimeSettingsResponseDto findSettings(String login);
}
