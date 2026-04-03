package com.example.telos.controller.page;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/productivity")
public class ProductivityController {
    @GetMapping
    public String productivity() {
        return "productivity";
    }
}
