package com.example.telos.service.impl;

import com.example.telos.dto.UserPasswordDto;
import com.example.telos.dto.UserPasswordResponseDto;
import com.example.telos.dto.UserUsernameResponseDto;
import com.example.telos.exception.NullEntityReferenceException;
import com.example.telos.exception.UsernameAlreadyTakenException;
import com.example.telos.model.User;
import com.example.telos.repository.UserRepository;
import com.example.telos.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User not found with id: " + id));
    }

    @Override
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("User not found with email: " + email));
    }

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new EntityNotFoundException("User not found with username: " + username));
    }

    @Override
    public User create(User user) {
        if (user == null) throw new NullEntityReferenceException("User cannot be null");

        return userRepository.save(user);
    }

    @Override
    public User update(User newUser) {
        if (newUser == null) throw new NullEntityReferenceException("User cannot be null");
        if (newUser.getUserId() == null) throw new NullEntityReferenceException("UserId cannot be null");
        findById(newUser.getUserId());
        return userRepository.save(newUser);
    }

    @Override
    public void delete(User user) {
        if (user == null) throw new NullEntityReferenceException("User cannot be null");
        if (user.getUserId() == null) throw new NullEntityReferenceException("UserId cannot be null");
        findById(user.getUserId());
        userRepository.delete(user);
    }

    @Override
    public User findByEmailOrUsername(String login) {
        return userRepository.findByEmailOrUsername(login).orElseThrow(() -> new EntityNotFoundException("User not found with login: " + login));
    }

    @Override
    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Override
    public UserUsernameResponseDto updateUsername(String login, String username) {
        if (username == null || username.isBlank())
            throw new NullEntityReferenceException("Username cannot be empty");

        Optional<User> checkUser = userRepository.findByUsername(username.trim());
        User user = findByEmailOrUsername(login);

        if  (checkUser.isPresent() && !checkUser.get().getUserId().equals(user.getUserId()))
            throw new UsernameAlreadyTakenException("Username is already taken");

        user.setUsername(username.trim());
        update(user);
        return new UserUsernameResponseDto(
                user.getUsername(),
                "Username was successfully updated"
        );
    }

    @Override
    public UserPasswordResponseDto updatePassword(String login, UserPasswordDto userPasswordDto) {
        if (userPasswordDto == null)
            throw new NullEntityReferenceException("Password data cannot be null");

        if (userPasswordDto.getNewPassword() == null ||
                userPasswordDto.getOldPassword() == null ||
                userPasswordDto.getConfirmNewPassword() == null)
            throw new NullEntityReferenceException("Password data cannot be null");

        if (!userPasswordDto.getNewPassword().equals(userPasswordDto.getConfirmNewPassword()))
            throw new IllegalArgumentException("New password and confirm password don't match");

        User user = findByEmailOrUsername(login);

        if (!passwordEncoder.matches(userPasswordDto.getOldPassword(), user.getPassword()))
            throw new IllegalArgumentException("Current password is incorrect");

        user.setPassword(passwordEncoder.encode(userPasswordDto.getNewPassword()));
        update(user);
        return new UserPasswordResponseDto("New password was successfully updated");
    }
}
