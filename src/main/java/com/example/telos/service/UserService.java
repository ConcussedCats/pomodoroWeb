package com.example.telos.service;

import com.example.telos.dto.UserPasswordDto;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserUsernameResponseDto;

import com.example.telos.model.User;

import java.util.List;

public interface UserService {
    User findById(Long id);
    User findByEmail(String email);
    User findByUsername(String username);
    User create(User user);
    User update(User newUser);
    void delete(User user);
    User findByEmailOrUsername(String login);
    List<User> findAll();
    UserUsernameResponseDto updateUsername(String login, String username);
    UserPasswordResponseDto updatePassword(String login, UserPasswordDto userPasswordDto);
}
