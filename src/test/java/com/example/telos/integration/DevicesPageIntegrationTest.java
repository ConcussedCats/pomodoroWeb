package com.example.telos.integration;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DevicesPageIntegrationTest extends DeviceIntegrationTestSupport {

    /**
     * The pairing dialog is position: fixed. Inside .devices-shell (backdrop-filter) it was sized against the
     * shell and squeezed; inside <main> (its own stacking layer) it could not cover the header.
     */
    @Test
    void pairingWizardIsRenderedOutsideMain() throws Exception {
        String html = mockMvc.perform(get("/devices").with(as(OWNER)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        int mainEnd = html.indexOf("</main>");
        int wizard = html.indexOf("class=\"device-wizard-overlay hidden\"");
        assertThat(mainEnd).isNotNegative();
        assertThat(wizard).as("wizard is rendered after </main>").isGreaterThan(mainEnd);
    }

    /** Without the --primary / --secondary modifiers a visited link takes the global a:visited color. */
    @Test
    void guestButtonsKeepTheirColorsWhenVisited() throws Exception {
        for (String page : new String[] {"/devices", "/history"}) {
            String html = mockMvc.perform(get(page))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();

            assertThat(html).as(page).contains("productivity-guest-button--primary\" href=\"/login\"");
            assertThat(html).as(page).contains("productivity-guest-button--secondary\" href=\"/register\"");
        }
    }
}
