package com.example.telos.controller;

import com.example.telos.model.User;
import com.example.telos.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.ui.Model;

import java.security.Principal;

@AllArgsConstructor
@Controller
@RequestMapping("/user")
public class UserController {
    private final UserService userService;

    @GetMapping
    public String user(Model model, Principal principal) {
        User curUser = userService.findByEmail(principal.getName());
        model.addAttribute("curUsername", curUser.getUsername());
        return "user";
    }
}
