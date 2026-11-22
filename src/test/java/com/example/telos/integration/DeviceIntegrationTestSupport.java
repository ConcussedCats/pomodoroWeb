package com.example.telos.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Helpers shared by the device integration tests. */
public abstract class DeviceIntegrationTestSupport extends PostgresIntegrationTest {
    protected static final String OWNER = "user@test.com";
    protected static final String OTHER_USER = "guest@test.com";

    @Autowired
    protected ObjectMapper objectMapper;

    protected static RequestPostProcessor as(String email) {
        return user(email).roles("USER");
    }

    protected JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    protected JsonNode createPairing(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/device-pairings").with(as(email)).with(csrf())).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        return json(result);
    }

    protected SimulatedCube newCube(String hardwareId) {
        return new SimulatedCube(mockMvc, objectMapper, clock, hardwareId);
    }

    /** Pairs a new simulated cube with the given user and returns it. */
    protected SimulatedCube pairedCube(String email, String hardwareId) throws Exception {
        SimulatedCube cube = newCube(hardwareId);
        MvcResult result = cube.pair(createPairing(email).get("pairingToken").asText());
        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        return cube;
    }

    protected JsonNode webState(String email, Long deviceId) throws Exception {
        return json(mockMvc.perform(get("/api/devices/" + deviceId + "/state").with(as(email))).andReturn());
    }
}
