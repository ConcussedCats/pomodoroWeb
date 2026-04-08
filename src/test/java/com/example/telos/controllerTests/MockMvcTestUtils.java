package com.example.telos.controllerTests;

import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.servlet.View;
import org.springframework.web.servlet.view.AbstractView;

import java.util.Map;

public final class MockMvcTestUtils {

    private MockMvcTestUtils() {
    }

    public static MockMvc standalone(Object controller) {
        return MockMvcBuilders
                .standaloneSetup(controller)
                .setViewResolvers((viewName, locale) -> noopView())
                .build();
    }

    private static View noopView() {
        return new AbstractView() {
            @Override
            protected void renderMergedOutputModel(
                    Map<String, Object> model,
                    jakarta.servlet.http.HttpServletRequest request,
                    jakarta.servlet.http.HttpServletResponse response
            ) {
            }
        };
    }
}
