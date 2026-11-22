package com.example.telos.integration;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DevicesPageIntegrationTest extends DeviceIntegrationTestSupport {

    /**
     * The pairing dialog is position: fixed. Inside .devices-shell (which has a backdrop-filter)
     * it would be sized against the shell instead of the window and get squeezed.
     */
    @Test
    void pairingWizardIsNotNestedInsideTheShell() throws Exception {
        String html = mockMvc.perform(get("/devices").with(as(OWNER)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        int main = html.indexOf("<main");
        int wizard = html.indexOf("class=\"device-wizard hidden\"");
        assertThat(main).isNotNegative();
        assertThat(wizard).isGreaterThan(main);

        String beforeWizard = html.substring(main, wizard);
        assertThat(count(beforeWizard, "<div")).isEqualTo(count(beforeWizard, "</div>"));
    }

    private static int count(String text, String token) {
        int found = 0;
        for (int at = text.indexOf(token); at >= 0; at = text.indexOf(token, at + token.length())) {
            found++;
        }
        return found;
    }
}
