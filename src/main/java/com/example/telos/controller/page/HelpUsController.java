package com.example.telos.controller.page;

import com.example.telos.security.PostLoginRedirects;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequestMapping("/helpus")
public class HelpUsController {
    @GetMapping
    public String helpUs(Authentication authentication, HttpServletRequest request) {
        PostLoginRedirects.saveTargetForAnonymous(authentication, request, "/helpus");
        return "helpus";
    }
}
