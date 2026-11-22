package com.example.telos.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** One timer for browser and cube: SET_STATE / RELEASE handover and the shared phase end (PROTOCOL.md 1.4, 1.6). */
class DeviceHandoverIntegrationTest extends DeviceIntegrationTestSupport {

    private MvcResult postCommand(SimulatedCube cube, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/devices/" + cube.deviceId() + "/commands")
                        .with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
    }

    private Map<String, Object> setState(String mode, Map<String, Object> target) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "SET_STATE");
        body.put("mode", mode);
        body.put("targetState", target);
        return body;
    }

    private Map<String, Object> runningTarget(long endsAt, UUID sessionId) {
        Map<String, Object> target = new LinkedHashMap<>();
        target.put("status", "RUNNING");
        target.put("durationSeconds", 1500);
        target.put("endsAt", endsAt);
        target.put("sessionId", sessionId.toString());
        target.put("sessionStartedAt", clock.millis() - 300_000);
        target.put("cycleIndex", 1);
        target.put("phaseIndex", 2);
        return target;
    }

    @Test
    void browserPhaseContinuesOnTheCubeWithTheSameEndAndSession() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HANDOVER001");
        UUID browserSession = UUID.randomUUID();
        long endsAt = clock.millis() + 1_200_000;

        assertThat(postCommand(cube, setState("pomodoro", runningTarget(endsAt, browserSession)))
                .getResponse().getStatus()).isEqualTo(202);

        // The cube polls 2.5 s later; the phase must still end at the same moment.
        clock.advance(Duration.ofMillis(2_500));
        JsonNode command = cube.pollCommands().get(0);
        assertThat(command.at("/targetState/endsAt").asLong()).isEqualTo(endsAt);
        assertThat(command.at("/targetState/remainingSeconds").asInt()).isEqualTo(1198);
        cube.executePendingCommands();

        JsonNode state = webState(OWNER, cube.deviceId());
        assertThat(state.get("status").asText()).isEqualTo("RUNNING");
        assertThat(state.get("endsAt").asLong()).isEqualTo(endsAt);
        assertThat(state.get("sessionId").asText()).isEqualTo(browserSession.toString());
        assertThat(state.get("cycleIndex").asInt()).isEqualTo(1);
        assertThat(state.get("phaseIndex").asInt()).isEqualTo(2);

        Map<String, Object> session = jdbcTemplate.queryForMap(
                "SELECT status, started_at FROM pomodoro_sessions WHERE external_id = ?", browserSession);
        assertThat(session.get("status")).isEqualTo("IN_PROGRESS");
        assertThat(((Timestamp) session.get("started_at")).toInstant()).isEqualTo(Instant.ofEpochMilli(clock.millis() - 302_500));
    }

    @Test
    void pausedBrowserPhaseStaysPausedOnTheCube() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HANDOVER002");
        Map<String, Object> target = new LinkedHashMap<>();
        target.put("status", "PAUSED");
        target.put("durationSeconds", 300);
        target.put("remainingSeconds", 140);
        target.put("sessionId", UUID.randomUUID().toString());

        postCommand(cube, setState("SHORT_BREAK", target));
        cube.executePendingCommands();

        JsonNode state = webState(OWNER, cube.deviceId());
        assertThat(state.get("status").asText()).isEqualTo("PAUSED");
        assertThat(state.get("mode").asText()).isEqualTo("SHORT_BREAK");
        assertThat(state.get("remainingSeconds").asInt()).isEqualTo(140);
    }

    @Test
    void setStateIsValidated() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HANDOVER003");
        assertThat(json(postCommand(cube, setState("WORK", null))).get("errorCode").asText()).isEqualTo("TARGET_REQUIRED");

        Map<String, Object> noEnd = runningTarget(0, UUID.randomUUID());
        noEnd.remove("endsAt");
        assertThat(json(postCommand(cube, setState("WORK", noEnd))).get("errorCode").asText()).isEqualTo("INVALID_TARGET");

        Map<String, Object> past = runningTarget(clock.millis() - 1, UUID.randomUUID());
        assertThat(json(postCommand(cube, setState("WORK", past))).get("errorCode").asText()).isEqualTo("INVALID_TARGET");

        Map<String, Object> tooLong = runningTarget(clock.millis() + 3_600_000, UUID.randomUUID());
        assertThat(json(postCommand(cube, setState("WORK", tooLong))).get("errorCode").asText()).isEqualTo("INVALID_TARGET");

        Map<String, Object> paused = new LinkedHashMap<>();
        paused.put("status", "PAUSED");
        paused.put("durationSeconds", 300);
        paused.put("remainingSeconds", 301);
        assertThat(json(postCommand(cube, setState("WORK", paused))).get("errorCode").asText()).isEqualTo("INVALID_TARGET");
    }

    @Test
    void releaseKeepsTheSessionOpenAndTheBrowserFinishesIt() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HANDOVER004");
        cube.flip("WORK").flush();
        UUID session = cube.sessionId();
        clock.advance(Duration.ofMinutes(10));
        cube.heartbeat();

        postCommand(cube, Map.of("type", "RELEASE"));
        cube.executePendingCommands();
        JsonNode state = webState(OWNER, cube.deviceId());
        assertThat(state.get("status").asText()).isEqualTo("STOPPED");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT status FROM pomodoro_sessions WHERE external_id = ?", String.class, session)).isEqualTo("IN_PROGRESS");

        // The browser continued the phase and finished it 15 minutes later.
        clock.advance(Duration.ofMinutes(15));
        Map<String, Object> record = new LinkedHashMap<>();
        record.put("externalId", session.toString());
        record.put("type", "pomodoro");
        record.put("status", "COMPLETED");
        record.put("plannedDurationSeconds", 1500);
        record.put("actualDurationSeconds", 1500);
        record.put("startedAt", START.toEpochMilli());
        record.put("finishedAt", clock.millis());
        mockMvc.perform(post("/api/pomodoro-sessions").with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(record)))
                .andExpect(status().isOk());

        Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT status, actual_duration_seconds, source FROM pomodoro_sessions WHERE external_id = ?", session);
        assertThat(row.get("status")).isEqualTo("COMPLETED");
        assertThat(row.get("actual_duration_seconds")).isEqualTo(1500);
        assertThat(row.get("source")).isEqualTo("DEVICE");
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM pomodoro_sessions", Integer.class)).isEqualTo(1);
    }

    @Test
    void stopStillEndsTheSessionAsInterrupted() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HANDOVER005");
        cube.flip("WORK").flush();
        clock.advance(Duration.ofMinutes(5));
        cube.heartbeat();
        postCommand(cube, Map.of("type", "STOP"));
        cube.executePendingCommands();
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM pomodoro_sessions", String.class)).isEqualTo("INTERRUPTED");
    }

    @Test
    void reportsWithAlmostTheSameEndDoNotCreateNewVersions() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HANDOVER006");
        cube.flip("WORK").flush();
        long version = webState(OWNER, cube.deviceId()).get("version").asLong();
        long endsAt = webState(OWNER, cube.deviceId()).get("endsAt").asLong();
        String session = cube.sessionId().toString();

        Map<String, Object> state = new LinkedHashMap<>();
        state.put("mode", "WORK");
        state.put("status", "RUNNING");
        state.put("durationSeconds", 1500);
        state.put("remainingSeconds", 1400);
        state.put("sessionId", session);
        state.put("endsAt", endsAt + 900); // clock jitter of the cube
        clock.advance(Duration.ofSeconds(100));
        heartbeat(cube, state);
        assertThat(webState(OWNER, cube.deviceId()).get("version").asLong()).isEqualTo(version);

        state.put("endsAt", endsAt + 5_000); // a real change of the end
        heartbeat(cube, state);
        JsonNode changed = webState(OWNER, cube.deviceId());
        assertThat(changed.get("version").asLong()).isEqualTo(version + 1);
        assertThat(changed.get("endsAt").asLong()).isEqualTo(endsAt + 5_000);
    }

    private void heartbeat(SimulatedCube cube, Map<String, Object> state) throws Exception {
        mockMvc.perform(cube.authorized(post("/api/devices/heartbeat"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("firmwareVersion", "0.1.0", "state", state))))
                .andExpect(status().isOk());
    }
}
