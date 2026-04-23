package com.example.telos.controller.page;

import com.example.telos.model.User;
import com.example.telos.service.LogErrorService;
import com.example.telos.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;

@AllArgsConstructor
@Controller
@RequestMapping("/admin")
public class AdminController {
    private final UserService userService;
    private final LogErrorService logErrorService;

    @GetMapping
    public String admin(Model model, Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        User user = userService.findByEmail(principal.getName());
        if (!Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        model.addAttribute("errorLogs", logErrorService.findAllByNewestFirst());
        return "admin";
    }
}
