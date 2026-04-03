package com.example.telos.controllerTests;


import com.example.telos.controller.page.HelpUsController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HelpUsController.class)
public class HelpUsControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void shouldReturnHelpUsPage() throws Exception{
        mockMvc.perform(get("/helpus"))
                .andExpect(status().isOk())
                .andExpect(view().name("helpus"));
    }
}
