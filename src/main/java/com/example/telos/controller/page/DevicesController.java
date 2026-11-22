package com.example.telos.controller.page;

import com.example.telos.security.PostLoginRedirects;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/devices")
public class DevicesController {
    @GetMapping
    public String devices(HttpServletRequest request) {
        PostLoginRedirects.saveTargetForAnonymous(request, "/devices");
        return "devices";
    }
}
