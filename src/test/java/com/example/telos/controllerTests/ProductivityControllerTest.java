package com.example.telos.controllerTests;

import com.example.telos.controller.page.ProductivityController;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

public class ProductivityControllerTest {

    private final MockMvc mockMvc = MockMvcTestUtils.standalone(new ProductivityController());

    @Test
    void shouldReturnProductivityPage() throws Exception {
        mockMvc.perform(get("/productivity"))
                .andExpect(status().isOk())
                .andExpect(view().name("productivity"));
    }
}
