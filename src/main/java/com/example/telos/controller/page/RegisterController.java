package com.example.telos.controller.page;

import com.example.telos.dto.RegisterRequest;
import com.example.telos.exception.UsernameAlreadyTakenException;
import com.example.telos.model.User;
import com.example.telos.service.UserService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
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
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    @GetMapping
    public String register(Authentication authentication) {
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            return "redirect:/user";
        }
        return "register";
    }

    @PostMapping
    public String registerUser(@Valid @ModelAttribute RegisterRequest registerRequest,
                               BindingResult bindingResult,
                               HttpServletRequest request,
                               HttpServletResponse response,
                               Model model) {
        if (bindingResult.hasErrors()) {
            fillFormModel(model, registerRequest, bindingResult.getFieldError() != null
                    ? bindingResult.getFieldError().getDefaultMessage()
                    : "Please check the entered data");
            return "register";
        }

        try {
            User user = userService.register(registerRequest);
            authenticateUser(user.getEmail(), registerRequest.getPassword(), request, response);
            return "redirect:/user";
        } catch (UsernameAlreadyTakenException | IllegalArgumentException exception) {
            fillFormModel(model, registerRequest, exception.getMessage());
            return "register";
        }
    }

    private void authenticateUser(String login, String password, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(login, password)
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    private void fillFormModel(Model model, RegisterRequest registerRequest, String errorMessage) {
        model.addAttribute("error", errorMessage);
        model.addAttribute("username", registerRequest.getUsername());
        model.addAttribute("email", registerRequest.getEmail());
    }
}
