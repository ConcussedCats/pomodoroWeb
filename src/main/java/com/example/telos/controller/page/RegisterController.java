package com.example.telos.controller.page;

import com.example.telos.dto.RegisterRequest;
import com.example.telos.exception.UsernameAlreadyTakenException;
import com.example.telos.service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@AllArgsConstructor
@Controller
@RequestMapping("/register")
public class RegisterController {

    private final UserService userService;

    @GetMapping
    public String register() {
        return "register";
    }

    @PostMapping
    public String registerUser(@Valid @ModelAttribute RegisterRequest registerRequest,
                               BindingResult bindingResult,
                               Model model) {
        if (bindingResult.hasErrors()) {
            fillFormModel(model, registerRequest, bindingResult.getFieldError() != null
                    ? bindingResult.getFieldError().getDefaultMessage()
                    : "Please check the entered data");
            return "register";
        }

        try {
            userService.register(registerRequest);
            return "redirect:/login";
        } catch (UsernameAlreadyTakenException | IllegalArgumentException exception) {
            fillFormModel(model, registerRequest, exception.getMessage());
            return "register";
        }
    }

    private void fillFormModel(Model model, RegisterRequest registerRequest, String errorMessage) {
        model.addAttribute("error", errorMessage);
        model.addAttribute("username", registerRequest.getUsername());
        model.addAttribute("email", registerRequest.getEmail());
    }
}
