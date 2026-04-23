package com.example.telos.controllerTests;


import com.example.telos.controller.page.HelpUsController;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class HelpUsControllerTest {

    private final MockMvc mockMvc = MockMvcTestUtils.standalone(new HelpUsController());

    @Test
    void shouldReturnHelpUsPage() throws Exception{
        mockMvc.perform(get("/helpus"))
                .andExpect(status().isOk())
                .andExpect(view().name("helpus"));
    }
}
