package com.example.telos.controller.page;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequestMapping("/about")
public class AboutUsController {
    @GetMapping
    public String aboutUs() {
        return "about";
    }
}
