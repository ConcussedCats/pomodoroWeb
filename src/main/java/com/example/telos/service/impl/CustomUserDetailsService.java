package com.example.telos.service.impl;

import com.example.telos.model.User;
import com.example.telos.service.UserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.security.core.userdetails.UserDetailsService;

@Service
@AllArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserService userService;


    @Override
    public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        try {
            User user = userService.findByEmailOrUsername(login);
            return new org.springframework.security.core.userdetails.User(
                    user.getEmail(),
                    user.getPassword(),
                    AuthorityUtils.createAuthorityList("ROLE_USER")
            );
        } catch (EntityNotFoundException exception) {
            throw new UsernameNotFoundException("User not found with login: " + login, exception);
        }
    }
}
