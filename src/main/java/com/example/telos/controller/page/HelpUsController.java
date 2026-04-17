package com.example.telos.controller.page;

import com.example.telos.security.PostLoginRedirects;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequestMapping("/helpus")
public class HelpUsController {
    @GetMapping
    public String helpUs(HttpServletRequest request) {
        PostLoginRedirects.saveTargetForAnonymous(request, "/helpus");
        return "helpus";
    }
}
