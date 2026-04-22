package com.example.telos.controller.page;

import com.example.telos.security.PostLoginRedirects;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequestMapping("/")
public class HomeController {
    @GetMapping
    public String home(HttpServletRequest request) {
        PostLoginRedirects.saveTargetForAnonymous(request, "/");
        return "index";
    }
}
