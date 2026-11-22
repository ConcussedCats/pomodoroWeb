package com.example.telos.controller.page;

import com.example.telos.security.PostLoginRedirects;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/history")
public class HistoryController {
    @GetMapping
    public String history(HttpServletRequest request) {
        PostLoginRedirects.saveTargetForAnonymous(request, "/history");
        return "history";
    }
}
