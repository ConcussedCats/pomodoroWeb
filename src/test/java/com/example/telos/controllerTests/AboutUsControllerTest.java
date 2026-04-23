package com.example.telos.controllerTests;

import com.example.telos.controller.page.AboutUsController;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class AboutUsControllerTest {

    private final MockMvc mockMvc = MockMvcTestUtils.standalone(new AboutUsController());

    @Test
    void shouldReturnAboutPage() throws Exception {
        mockMvc.perform(get("/about"))
                .andExpect(status().isOk())
                .andExpect(view().name("about"));
    }
}
