package com.example.telos.service;

import com.example.telos.exception.NullEntityReferenceException;
import com.example.telos.model.User;
import org.springframework.stereotype.Service;

import java.security.Principal;

/** Resolves the id of the logged-in user from a session or JWT principal. */
@Service
public class CurrentUserService {
    private final UserService userService;

    public CurrentUserService(UserService userService) {
        this.userService = userService;
    }

    public Long userId(Principal principal) {
        User user = userService.findByEmailOrUsername(principal.getName());
        if (user.getUserId() == null) {
            throw new NullEntityReferenceException("User id is null");
        }
        return user.getUserId();
    }
}
