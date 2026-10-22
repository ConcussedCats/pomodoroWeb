package com.example.telos.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DevicePairingAndAuthIntegrationTest extends DeviceIntegrationTestSupport {

    @Test
    void pairingTokenIsOneTimeAndDeviceAppearsInAccount() throws Exception {
        JsonNode pairing = createPairing(OWNER);
        String token = pairing.get("pairingToken").asText();
        assertThat(token).hasSize(43);
        assertThat(pairing.get("expiresAt").asLong()).isEqualTo(START.plus(Duration.ofMinutes(5)).toEpochMilli());

        SimulatedCube cube = newCube("A1B2C3D4E5F6");
        MvcResult paired = cube.pair(token);
        assertThat(paired.getResponse().getStatus()).isEqualTo(201);
        assertThat(cube.secret()).hasSize(43);
        assertThat(json(paired).get("heartbeatIntervalSeconds").asInt()).isEqualTo(30);

        mockMvc.perform(get("/api/device-pairings/" + pairing.get("pairingId").asLong()).with(as(OWNER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLAIMED"))
                .andExpect(jsonPath("$.deviceId").value(cube.deviceId()));

        mockMvc.perform(get("/api/devices").with(as(OWNER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].hardwareId").value("A1B2C3D4E5F6"))
                .andExpect(jsonPath("$[0].status").value("ONLINE"))
                .andExpect(jsonPath("$[0].capabilities.vibration").value(true));

        MvcResult reused = newCube("FFFFFFFFFFFF").pair(token);
        assertThat(reused.getResponse().getStatus()).isEqualTo(409);
        assertThat(json(reused).get("errorCode").asText()).isEqualTo("PAIRING_TOKEN_USED");
    }

    @Test
    void secretIsStoredOnlyAsHash() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HASHCHECK01");
        String stored = jdbcTemplate.queryForObject(
                "SELECT device_secret_hash FROM devices WHERE device_id = ?", String.class, cube.deviceId());
        assertThat(stored).hasSize(64).doesNotContain(cube.secret());
        Integer plainTokens = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM device_pairings WHERE pairing_token_hash NOT SIMILAR TO '[0-9a-f]{64}'", Integer.class);
        assertThat(plainTokens).isZero();
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        JsonNode pairing = createPairing(OWNER);
        clock.advance(Duration.ofMinutes(5).plusSeconds(1));

        MvcResult result = newCube("EXPIRED0001").pair(pairing.get("pairingToken").asText());
        assertThat(result.getResponse().getStatus()).isEqualTo(410);
        assertThat(json(result).get("errorCode").asText()).isEqualTo("PAIRING_TOKEN_EXPIRED");

        mockMvc.perform(get("/api/device-pairings/" + pairing.get("pairingId").asLong()).with(as(OWNER)))
                .andExpect(jsonPath("$.status").value("EXPIRED"));
    }

    @Test
    void unknownTokenIsRejected() throws Exception {
        MvcResult result = newCube("UNKNOWN0001").pair("not-a-real-token");
        assertThat(result.getResponse().getStatus()).isEqualTo(400);
        assertThat(json(result).get("errorCode").asText()).isEqualTo("PAIRING_TOKEN_INVALID");
    }

    @Test
    void newPairingInvalidatesThePreviousOpenOne() throws Exception {
        JsonNode first = createPairing(OWNER);
        createPairing(OWNER);

        MvcResult result = newCube("SUPERSEDED1").pair(first.get("pairingToken").asText());
        assertThat(result.getResponse().getStatus()).isEqualTo(410);
    }

    @Test
    void pairingStatusOfAnotherUserIsNotVisible() throws Exception {
        JsonNode pairing = createPairing(OWNER);
        mockMvc.perform(get("/api/device-pairings/" + pairing.get("pairingId").asLong()).with(as(OTHER_USER)))
                .andExpect(status().isNotFound());
    }

    @Test
    void cubeOwnedByAnotherUserCannotBeTakenOver() throws Exception {
        pairedCube(OWNER, "OWNEDCUBE01");

        MvcResult result = newCube("OWNEDCUBE01").pair(createPairing(OTHER_USER).get("pairingToken").asText());
        assertThat(result.getResponse().getStatus()).isEqualTo(409);
        assertThat(json(result).get("errorCode").asText()).isEqualTo("DEVICE_OWNED_BY_ANOTHER_USER");

        Integer owners = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM devices WHERE hardware_id = 'OWNEDCUBE01'", Integer.class);
        assertThat(owners).isEqualTo(1);
    }

    @Test
    void rePairingSameUserRotatesSecretAndKeepsDevice() throws Exception {
        SimulatedCube first = pairedCube(OWNER, "REPAIR00001");
        String oldSecret = first.secret();

        SimulatedCube again = newCube("REPAIR00001");
        again.pair(createPairing(OWNER).get("pairingToken").asText());

        assertThat(again.deviceId()).isEqualTo(first.deviceId());
        assertThat(again.secret()).isNotEqualTo(oldSecret);
        assertThat(first.heartbeat().getResponse().getStatus()).isEqualTo(401);
        assertThat(again.heartbeat().getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void deviceEndpointsRequireValidDeviceSecret() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "AUTHCUBE001");

        mockMvc.perform(get("/api/device/commands"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("DEVICE_UNAUTHORIZED"));

        mockMvc.perform(get("/api/device/commands")
                        .header("Authorization", "Device wrong-secret")
                        .header("X-Device-Id", cube.hardwareId()))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/device/commands")
                        .header("Authorization", "Device " + cube.secret())
                        .header("X-Device-Id", "SOMEOTHERCUBE"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(cube.authorized(get("/api/device/commands")))
                .andExpect(status().isOk());
    }

    @Test
    void userCredentialsAreNotAcceptedOnDeviceEndpoints() throws Exception {
        pairedCube(OWNER, "ISOLATION01");

        // A real logged-in browser session (cookie) is ignored by the device chain.
        org.springframework.mock.web.MockHttpSession session = new org.springframework.mock.web.MockHttpSession();
        org.springframework.security.core.context.SecurityContext context =
                org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                OWNER, null, java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER"))));
        session.setAttribute(
                org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
        mockMvc.perform(get("/api/device/commands").session(session))
                .andExpect(status().isUnauthorized());
        // Control: the same session works on the user API.
        mockMvc.perform(get("/api/devices").session(session))
                .andExpect(status().isOk());

        // Even an authenticated user principal is not a device.
        mockMvc.perform(get("/api/device/commands").with(as(OWNER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/device/commands").header("Authorization", "Bearer some.user.jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deviceSecretIsNotAcceptedOnUserEndpoints() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "ISOLATION02");

        mockMvc.perform(cube.authorized(get("/api/devices")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(cube.authorized(get("/api/user/time-settings")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(cube.authorized(get("/api/productivity/notes")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deviceOperationsCheckOwnership() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "OWNERSHIP01");
        String path = "/api/devices/" + cube.deviceId();

        mockMvc.perform(get(path).with(as(OTHER_USER))).andExpect(status().isNotFound());
        mockMvc.perform(get(path + "/state").with(as(OTHER_USER))).andExpect(status().isNotFound());
        mockMvc.perform(get(path + "/settings").with(as(OTHER_USER))).andExpect(status().isNotFound());
        mockMvc.perform(patch(path).with(as(OTHER_USER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Mine now\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(post(path + "/commands").with(as(OTHER_USER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"PAUSE\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete(path).with(as(OTHER_USER)).with(csrf())).andExpect(status().isNotFound());

        mockMvc.perform(get(path).with(as(OWNER))).andExpect(status().isOk());
    }

    @Test
    void renameAndUnbindRevokeAccess() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "UNBIND00001");
        String path = "/api/devices/" + cube.deviceId();

        mockMvc.perform(patch(path).with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  Desk cube  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Desk cube"));

        mockMvc.perform(patch(path).with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(delete(path).with(as(OWNER))).andExpect(status().isForbidden());
        mockMvc.perform(delete(path).with(as(OWNER)).with(csrf())).andExpect(status().isNoContent());

        assertThat(cube.heartbeat().getResponse().getStatus()).isEqualTo(401);
        mockMvc.perform(get("/api/devices").with(as(OWNER))).andExpect(jsonPath("$.length()").value(0));

        // After unbinding, the same cube can be paired again (also by another account).
        assertThat(newCube("UNBIND00001").pair(createPairing(OTHER_USER).get("pairingToken").asText())
                .getResponse().getStatus()).isEqualTo(201);
    }

    @Test
    void pairingPayloadIsValidated() throws Exception {
        mockMvc.perform(post("/api/devices/pair").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pairingToken\":\"x\",\"hardwareId\":\"bad id with spaces\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void invalidNameDoesNotBurnTheTokenAndFallsBackToDefault() throws Exception {
        String token = createPairing(OWNER).get("pairingToken").asText();
        MvcResult result = mockMvc.perform(post("/api/devices/pair").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("pairingToken", token, "hardwareId", "NAMECHECK01", "name", "\u0001\u0002"))))
                .andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(201);
        assertThat(jdbcTemplate.queryForObject("SELECT name FROM devices WHERE hardware_id = 'NAMECHECK01'", String.class))
                .isEqualTo("Pomodoro Cube");
    }

    @Test
    void pairingCreatesTheTimerStateRightAway() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "STATEROW001");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT version FROM device_timer_states WHERE device_id = ?", Long.class, cube.deviceId())).isZero();
    }

    @Test
    void anonymousUsersCannotUseDeviceManagement() throws Exception {
        mockMvc.perform(get("/api/devices")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/device-pairings").with(csrf())).andExpect(status().isUnauthorized());
    }
}
