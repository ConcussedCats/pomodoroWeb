package com.example.telos.integration;

import com.example.telos.service.device.DevicePresenceService;
import com.example.telos.service.device.DeviceTimerService;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DeviceTimerSyncIntegrationTest extends DeviceIntegrationTestSupport {

    @Autowired
    private DevicePresenceService presenceService;

    @Autowired
    private DeviceTimerService timerService;

    // ------------------------------------------------------------- ESP32 -> website

    @Test
    void flippingToWorkStartsTimerOnServer() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "SYNC0000001");

        JsonNode initial = webState(OWNER, cube.deviceId());
        assertThat(initial.get("status").asText()).isEqualTo("STOPPED");
        assertThat(initial.get("version").asLong()).isZero();

        MvcResult result = cube.flip("WORK").flush();
        JsonNode body = json(result);
        assertThat(body.get("results").get(0).get("result").asText()).isEqualTo("APPLIED");

        JsonNode state = webState(OWNER, cube.deviceId());
        assertThat(state.get("status").asText()).isEqualTo("RUNNING");
        assertThat(state.get("mode").asText()).isEqualTo("WORK");
        assertThat(state.get("webMode").asText()).isEqualTo("pomodoro");
        assertThat(state.get("durationSeconds").asInt()).isEqualTo(25 * 60);
        assertThat(state.get("endsAt").asLong()).isEqualTo(START.plusSeconds(25 * 60).toEpochMilli());
        assertThat(state.get("version").asLong()).isEqualTo(1);
        assertThat(state.get("sessionId").asText()).isEqualTo(cube.sessionId().toString());

        Integer inProgress = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM pomodoro_sessions WHERE status = 'IN_PROGRESS' AND source = 'DEVICE'", Integer.class);
        assertThat(inProgress).isEqualTo(1);
    }

    @Test
    void pauseFaceThenWorkFaceResumesSameSession() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "SYNC0000002");
        cube.flip("WORK").flush();
        UUID session = cube.sessionId();

        clock.advance(Duration.ofSeconds(100));
        cube.flip("PAUSE").flush();
        JsonNode paused = webState(OWNER, cube.deviceId());
        assertThat(paused.get("status").asText()).isEqualTo("PAUSED");
        assertThat(paused.get("remainingSeconds").asInt()).isEqualTo(25 * 60 - 100);
        assertThat(paused.get("endsAt").isNull()).isTrue();

        clock.advance(Duration.ofMinutes(10));
        cube.flip("WORK").flush();
        JsonNode resumed = webState(OWNER, cube.deviceId());
        assertThat(resumed.get("status").asText()).isEqualTo("RUNNING");
        assertThat(resumed.get("sessionId").asText()).isEqualTo(session.toString());
        assertThat(resumed.get("remainingSeconds").asInt()).isEqualTo(25 * 60 - 100);
        assertThat(resumed.get("version").asLong()).isEqualTo(3);
    }

    @Test
    void displayAndTechFacesChangeNothing() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "SYNC0000003");
        cube.flip("WORK").flush();

        JsonNode result = json(cube.flip("DISPLAY").flip("TECH").flush());
        assertThat(result.get("results").get(0).get("result").asText()).isEqualTo("IGNORED");
        assertThat(result.get("results").get(1).get("result").asText()).isEqualTo("IGNORED");
        assertThat(webState(OWNER, cube.deviceId()).get("version").asLong()).isEqualTo(1);

        mockMvc.perform(get("/api/devices/" + cube.deviceId()).with(as(OWNER)))
                .andExpect(jsonPath("$.lastFace").value("TECH"));
    }

    @Test
    void faceEventWithoutSnapshotIsDerivedOnServer() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "SYNC0000004");
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventId", UUID.randomUUID().toString());
        event.put("seq", 1);
        event.put("type", "FACE_CHANGED");
        event.put("face", "SHORT_BREAK");
        event.put("occurredAt", null);

        JsonNode result = json(cube.sendRaw(Map.of("bootId", "b1", "events", List.of(event))));
        assertThat(result.get("results").get(0).get("result").asText()).isEqualTo("APPLIED");
        assertThat(result.get("state").get("mode").asText()).isEqualTo("SHORT_BREAK");
        assertThat(result.get("state").get("status").asText()).isEqualTo("RUNNING");
        assertThat(result.get("state").get("durationSeconds").asInt()).isEqualTo(5 * 60);
    }

    @Test
    void duplicateEventsAreIgnored() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "DEDUP000001");
        cube.flip("WORK");
        List<Map<String, Object>> events = new ArrayList<>(cube.outbox());
        Map<String, Object> batch = Map.of("bootId", cube.bootId(), "events", events);

        assertThat(json(cube.sendRaw(batch)).get("results").get(0).get("result").asText()).isEqualTo("APPLIED");
        JsonNode replay = json(cube.sendRaw(batch));
        assertThat(replay.get("results").get(0).get("result").asText()).isEqualTo("DUPLICATE");

        assertThat(webState(OWNER, cube.deviceId()).get("version").asLong()).isEqualTo(1);
        Integer sessions = jdbcTemplate.queryForObject("SELECT count(*) FROM pomodoro_sessions", Integer.class);
        assertThat(sessions).isEqualTo(1);
    }

    @Test
    void olderSequenceInSameBootIsStale() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "STALE000001");
        cube.flip("WORK");
        cube.flip("PAUSE");
        List<Map<String, Object>> events = new ArrayList<>(cube.outbox());

        // Newer event (seq 2) arrives first, the older one (seq 1) afterwards.
        cube.sendRaw(Map.of("bootId", cube.bootId(), "events", List.of(events.get(1))));
        JsonNode late = json(cube.sendRaw(Map.of("bootId", cube.bootId(), "events", List.of(events.get(0)))));

        assertThat(late.get("results").get(0).get("result").asText()).isEqualTo("STALE");
        assertThat(webState(OWNER, cube.deviceId()).get("status").asText()).isEqualTo("PAUSED");
    }

    @Test
    void newBootAcceptsSequenceRestart() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "REBOOT00001");
        cube.flip("WORK").flush();
        cube.reboot();
        JsonNode result = json(cube.flip("PAUSE").flush());
        assertThat(result.get("results").get(0).get("result").asText()).isEqualTo("APPLIED");
    }

    @Test
    void invalidSnapshotIsRejectedWithoutChangingState() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "INVALID0001");
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("mode", "WORK");
        state.put("status", "RUNNING");
        state.put("durationSeconds", 1500);
        state.put("remainingSeconds", 9000);
        state.put("sessionId", UUID.randomUUID().toString());
        cube.queue("TIMER_STARTED", null, state);

        JsonNode result = json(cube.flush());
        assertThat(result.get("results").get(0).get("result").asText()).isEqualTo("REJECTED");
        assertThat(result.get("results").get(0).get("errorCode").asText()).isEqualTo("INVALID_REMAINING");
        assertThat(webState(OWNER, cube.deviceId()).get("version").asLong()).isZero();
    }

    @Test
    void finishingWorkCompletesSessionAndSuggestsNextPhase() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "FINISH00001");
        cube.flip("WORK").flush();
        clock.advance(Duration.ofMinutes(25));
        cube.finish().flush();

        JsonNode state = webState(OWNER, cube.deviceId());
        assertThat(state.get("status").asText()).isEqualTo("FINISHED");
        assertThat(state.get("remainingSeconds").asInt()).isZero();
        assertThat(state.get("suggestedNextMode").asText()).isEqualTo("SHORT_BREAK");
        assertThat(state.get("phaseIndex").asInt()).isEqualTo(1);

        Map<String, Object> session = jdbcTemplate.queryForMap("SELECT status, actual_duration_seconds FROM pomodoro_sessions");
        assertThat(session.get("status")).isEqualTo("COMPLETED");
        assertThat(session.get("actual_duration_seconds")).isEqualTo(1500);
    }

    @Test
    void switchingModeMidSessionRecordsInterruptedSession() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "INTERRUPT01");
        cube.flip("WORK").flush();
        clock.advance(Duration.ofMinutes(10));
        cube.flip("LONG_BREAK").flush();

        List<Map<String, Object>> sessions = jdbcTemplate.queryForList(
                "SELECT session_type, status, actual_duration_seconds FROM pomodoro_sessions ORDER BY session_row_id");
        assertThat(sessions).hasSize(2);
        assertThat(sessions.get(0).get("status")).isEqualTo("INTERRUPTED");
        assertThat(sessions.get(0).get("actual_duration_seconds")).isEqualTo(600);
        assertThat(sessions.get(1).get("session_type")).isEqualTo("LONG_BREAK");
        assertThat(sessions.get(1).get("status")).isEqualTo("IN_PROGRESS");
    }

    @Test
    void classicPatternSuggestionsFollowTheBrowserTimer() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "CLASSIC0001");
        List<String> suggestions = new ArrayList<>();
        String next = "WORK";
        for (int phase = 0; phase < 8; phase++) {
            cube.flip(next).flush();
            cube.finish().flush();
            next = webState(OWNER, cube.deviceId()).get("suggestedNextMode").asText();
            suggestions.add(next);
        }
        assertThat(suggestions).containsExactly(
                "SHORT_BREAK", "WORK", "SHORT_BREAK", "WORK", "SHORT_BREAK", "WORK", "LONG_BREAK", "WORK");
        assertThat(webState(OWNER, cube.deviceId()).get("cycleIndex").asInt()).isEqualTo(1);
    }

    @Test
    void compactPatternUsesUserTimeSettings() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/user/time-settings")
                        .with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pomodoroMinutes\":50,\"shortBreakMinutes\":10,\"longBreakMinutes\":30,"
                                + "\"pomoCycles\":2,\"soundsEnabled\":true,\"patternType\":\"compact\"}"))
                .andExpect(status().isOk());

        SimulatedCube cube = pairedCube(OWNER, "COMPACT0001");
        cube.fetchConfig();
        List<String> suggestions = new ArrayList<>();
        String next = "WORK";
        for (int phase = 0; phase < 8; phase++) {
            cube.flip(next).flush();
            cube.finish().flush();
            JsonNode state = webState(OWNER, cube.deviceId());
            next = state.get("suggestedNextMode").asText();
            suggestions.add(next);
            if (phase == 0) {
                assertThat(state.get("durationSeconds").asInt()).isEqualTo(50 * 60);
                assertThat(state.get("patternType").asText()).isEqualTo("compact");
                assertThat(state.get("totalCycles").asInt()).isEqualTo(2);
            }
        }
        assertThat(suggestions).containsExactly(
                "SHORT_BREAK", "WORK", "LONG_BREAK", "WORK", "SHORT_BREAK", "WORK", "LONG_BREAK", "WORK");
        assertThat(webState(OWNER, cube.deviceId()).get("sessionCompleted").asBoolean()).isTrue();
    }

    @Test
    void offlineQueueIsReplayedWithoutDuplicates() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "OFFLINE0001");
        // Wi-Fi lost: the cube keeps working and queues events.
        cube.flip("WORK");
        clock.advance(Duration.ofMinutes(25));
        cube.finish();
        cube.flip("SHORT_BREAK");
        clock.advance(Duration.ofMinutes(2));
        cube.flip("PAUSE");
        List<Map<String, Object>> queued = new ArrayList<>(cube.outbox());

        JsonNode result = json(cube.flush());
        assertThat(result.get("results")).hasSize(4);
        result.get("results").forEach(item -> assertThat(item.get("result").asText()).isEqualTo("APPLIED"));

        // The ack got lost; the cube resends the whole queue.
        JsonNode replay = json(cube.sendRaw(Map.of("bootId", cube.bootId(), "events", queued)));
        replay.get("results").forEach(item -> assertThat(item.get("result").asText()).isEqualTo("DUPLICATE"));

        List<Map<String, Object>> sessions = jdbcTemplate.queryForList(
                "SELECT session_type, status FROM pomodoro_sessions ORDER BY started_at");
        assertThat(sessions).hasSize(2);
        assertThat(sessions.get(0).get("status")).isEqualTo("COMPLETED");
        assertThat(sessions.get(1).get("session_type")).isEqualTo("SHORT_BREAK");
        assertThat(webState(OWNER, cube.deviceId()).get("status").asText()).isEqualTo("PAUSED");
    }

    // ------------------------------------------------------------- website -> ESP32

    @Test
    void webPauseIsShownOnlyAfterDeviceAcknowledges() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "COMMAND0001");
        cube.flip("WORK").flush();

        JsonNode command = json(mockMvc.perform(post("/api/devices/" + cube.deviceId() + "/commands")
                        .with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"PAUSE\",\"clientRequestId\":\"req-1\"}"))
                .andExpect(status().isAccepted())
                .andReturn());
        assertThat(command.get("status").asText()).isEqualTo("PENDING");
        assertThat(webState(OWNER, cube.deviceId()).get("status").asText()).isEqualTo("RUNNING");

        JsonNode polled = cube.pollCommands();
        assertThat(polled).hasSize(1);
        assertThat(polled.get(0).get("type").asText()).isEqualTo("PAUSE");
        assertThat(commandStatus(cube, command)).isEqualTo("DELIVERED");
        assertThat(webState(OWNER, cube.deviceId()).get("status").asText()).isEqualTo("RUNNING");

        clock.advance(Duration.ofSeconds(2));
        cube.executePendingCommands();

        assertThat(commandStatus(cube, command)).isEqualTo("EXECUTED");
        assertThat(webState(OWNER, cube.deviceId()).get("status").asText()).isEqualTo("PAUSED");
    }

    @Test
    void sameClientRequestIdDoesNotCreateSecondCommand() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "IDEMPOT0001");
        String body = "{\"type\":\"START\",\"mode\":\"pomodoro\",\"clientRequestId\":\"same\"}";
        JsonNode first = json(postCommand(cube, body));
        JsonNode second = json(postCommand(cube, body));
        assertThat(second.get("commandId").asText()).isEqualTo(first.get("commandId").asText());
        assertThat(cube.pollCommands()).hasSize(1);
    }

    @Test
    void repeatedAckIsIdempotent() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "REACK000001");
        postCommand(cube, "{\"type\":\"START\",\"mode\":\"WORK\"}");
        JsonNode command = cube.pollCommands().get(0);
        cube.executePendingCommands();
        long version = webState(OWNER, cube.deviceId()).get("version").asLong();

        MvcResult again = cube.ack(command.get("commandId").asText(), "EXECUTED", null);
        assertThat(again.getResponse().getStatus()).isEqualTo(200);
        assertThat(json(again).get("status").asText()).isEqualTo("EXECUTED");
        assertThat(webState(OWNER, cube.deviceId()).get("version").asLong()).isEqualTo(version);
        assertThat(cube.pollCommands()).isEmpty();
    }

    @Test
    void unackedCommandIsRedeliveredUntilAcked() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "REDELIVER01");
        postCommand(cube, "{\"type\":\"START\",\"mode\":\"WORK\"}");
        assertThat(cube.pollCommands()).hasSize(1);
        assertThat(cube.pollCommands()).hasSize(1);
    }

    @Test
    void rejectedCommandIsReportedAsFailure() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "REJECT00001");
        JsonNode command = json(postCommand(cube, "{\"type\":\"RESUME\"}"));
        cube.executePendingCommands();
        JsonNode stored = commandById(cube, command);
        assertThat(stored.get("status").asText()).isEqualTo("REJECTED");
        assertThat(stored.get("errorCode").asText()).isEqualTo("INVALID_STATE");
    }

    @Test
    void expiredCommandIsNeverExecuted() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "EXPIRECMD01");
        JsonNode command = json(postCommand(cube, "{\"type\":\"START\",\"mode\":\"WORK\"}"));
        clock.advance(Duration.ofSeconds(31));
        cube.heartbeat();

        assertThat(cube.pollCommands()).isEmpty();
        MvcResult lateAck = cube.ack(command.get("commandId").asText(), "EXECUTED", null);
        assertThat(lateAck.getResponse().getStatus()).isEqualTo(410);
        assertThat(commandStatus(cube, command)).isEqualTo("EXPIRED");

        JsonNode other = json(postCommand(cube, "{\"type\":\"STOP\"}"));
        clock.advance(Duration.ofSeconds(31));
        assertThat(timerService.expireOverdueCommands()).isEqualTo(1);
        assertThat(commandStatus(cube, other)).isEqualTo("EXPIRED");
    }

    @Test
    void commandsNeedOnlineDeviceAndValidMode() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "CMDCHECK001");

        mockMvc.perform(post("/api/devices/" + cube.deviceId() + "/commands").with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"START\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MODE_REQUIRED"));
        mockMvc.perform(post("/api/devices/" + cube.deviceId() + "/commands").with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"EXPLODE\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/devices/" + cube.deviceId() + "/commands").with(as(OWNER))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"PAUSE\"}"))
                .andExpect(status().isForbidden());

        clock.advance(Duration.ofSeconds(91));
        mockMvc.perform(post("/api/devices/" + cube.deviceId() + "/commands").with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"PAUSE\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DEVICE_OFFLINE"));
    }

    @Test
    void stopCommandResetsPatternPosition() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "STOPRESET01");
        cube.flip("WORK").flush();
        cube.finish().flush();
        assertThat(webState(OWNER, cube.deviceId()).get("phaseIndex").asInt()).isEqualTo(1);

        cube.flip("SHORT_BREAK").flush();
        postCommand(cube, "{\"type\":\"STOP\"}");
        cube.executePendingCommands();

        JsonNode state = webState(OWNER, cube.deviceId());
        assertThat(state.get("status").asText()).isEqualTo("STOPPED");
        assertThat(state.get("phaseIndex").asInt()).isZero();
        assertThat(state.get("suggestedNextMode").asText()).isEqualTo("WORK");
    }

    @Test
    void onlyOneOpenCommandAtATime() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "ONECMD00001");
        assertThat(postCommand(cube, "{\"type\":\"START\",\"mode\":\"WORK\"}").getResponse().getStatus()).isEqualTo(202);
        MvcResult second = postCommand(cube, "{\"type\":\"STOP\"}");
        assertThat(second.getResponse().getStatus()).isEqualTo(409);
        assertThat(json(second).get("errorCode").asText()).isEqualTo("COMMAND_IN_PROGRESS");

        cube.executePendingCommands();
        assertThat(postCommand(cube, "{\"type\":\"STOP\"}").getResponse().getStatus()).isEqualTo(202);
    }

    @Test
    void unsyncedDeviceClockDoesNotBumpTheVersionOnEveryHeartbeat() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "NOCLOCK0001");
        Map<String, Object> running = new LinkedHashMap<>();
        running.put("mode", "WORK");
        running.put("status", "RUNNING");
        running.put("durationSeconds", 1500);
        running.put("remainingSeconds", 1500);
        running.put("startedAt", null);
        running.put("sessionId", UUID.randomUUID().toString());
        Map<String, Object> heartbeat = Map.of("firmwareVersion", "0.1.0", "state", running);

        for (int beat = 0; beat < 3; beat++) {
            clock.advance(Duration.ofSeconds(30));
            mockMvc.perform(cube.authorized(post("/api/devices/heartbeat"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(heartbeat)))
                    .andExpect(status().isOk());
        }
        JsonNode state = webState(OWNER, cube.deviceId());
        assertThat(state.get("version").asLong()).isEqualTo(1);
        assertThat(state.get("startedAt").asLong()).isEqualTo(START.plusSeconds(30).toEpochMilli());
    }

    @Test
    void oldDeviceEventsArePruned(@Autowired com.example.telos.service.device.DeviceEventRetention retention) throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "RETENTION01");
        cube.flip("WORK").flush();
        clock.advance(Duration.ofDays(31));
        cube.flip("PAUSE").flush();

        assertThat(retention.prune()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM device_events", Integer.class)).isEqualTo(1);
    }

    // ------------------------------------------------------------- heartbeat, ONLINE / OFFLINE, settings

    @Test
    void heartbeatKeepsDeviceOnlineAndOnlyReportedMetricsAreStored() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HEARTBEAT01");
        clock.advance(Duration.ofSeconds(60));
        JsonNode heartbeat = json(cube.heartbeat());
        assertThat(heartbeat.get("serverTime").asLong()).isEqualTo(clock.millis());
        assertThat(heartbeat.get("configHash").asText()).hasSize(16);
        assertThat(heartbeat.get("pendingCommands").asInt()).isZero();

        mockMvc.perform(get("/api/devices/" + cube.deviceId()).with(as(OWNER)))
                .andExpect(jsonPath("$.status").value("ONLINE"))
                .andExpect(jsonPath("$.lastSeenAt").value(clock.millis()))
                .andExpect(jsonPath("$.metrics.wifiRssi").value(-60))
                .andExpect(jsonPath("$.metrics.batteryPercent").doesNotExist())
                .andExpect(jsonPath("$.firmwareVersion").value("0.1.0-sim"));
    }

    @Test
    void silentDeviceBecomesOfflineAndHeartbeatBringsItBack() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "PRESENCE001");
        clock.advance(Duration.ofSeconds(91));

        mockMvc.perform(get("/api/devices/" + cube.deviceId()).with(as(OWNER)))
                .andExpect(jsonPath("$.status").value("OFFLINE"));
        assertThat(presenceService.markSilentDevicesOffline()).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM devices", String.class)).isEqualTo("OFFLINE");

        cube.heartbeat();
        mockMvc.perform(get("/api/devices/" + cube.deviceId()).with(as(OWNER)))
                .andExpect(jsonPath("$.status").value("ONLINE"));
    }

    @Test
    void heartbeatStateRecoversAfterReconnect() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "RECOVER0001");
        cube.flip("WORK");
        cube.outbox().clear(); // events lost entirely, only the current state reaches the server
        JsonNode heartbeat = json(cube.heartbeat());
        assertThat(heartbeat.get("timerStateVersion").asLong()).isEqualTo(1);
        assertThat(webState(OWNER, cube.deviceId()).get("status").asText()).isEqualTo("RUNNING");
    }

    @Test
    void settingsAreSavedAndConfirmedByDeviceConfigHash() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "SETTINGS001");
        String path = "/api/devices/" + cube.deviceId() + "/settings";

        mockMvc.perform(get(path).with(as(OWNER)))
                .andExpect(jsonPath("$.vibrationEnabled").value(true))
                .andExpect(jsonPath("$.rgbBrightness").value(60))
                .andExpect(jsonPath("$.capabilities.rgb").value(false));

        mockMvc.perform(put(path).with(as(OWNER)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vibrationEnabled\":false,\"soundEnabled\":true,\"rgbBrightness\":101}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(put(path).with(as(OWNER)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"vibrationEnabled\":false,\"soundEnabled\":true,\"rgbBrightness\":30}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appliedOnDevice").value(false));

        JsonNode config = json(cube.fetchConfig());
        assertThat(config.get("hardware").get("vibrationEnabled").asBoolean()).isFalse();
        assertThat(config.get("hardware").get("rgbBrightness").asInt()).isEqualTo(30);
        assertThat(config.get("timer").get("pomodoroMinutes").asInt()).isEqualTo(25);
        assertThat(config.get("faces").get("PAUSE").asText()).isEqualTo("PAUSE");
        assertThat(config.get("faces").get("DISPLAY").asText()).isEqualTo("NONE");

        cube.heartbeat(config.get("configHash").asText());
        mockMvc.perform(get(path).with(as(OWNER))).andExpect(jsonPath("$.appliedOnDevice").value(true));
    }

    private MvcResult postCommand(SimulatedCube cube, String body) throws Exception {
        return mockMvc.perform(post("/api/devices/" + cube.deviceId() + "/commands")
                        .with(as(OWNER)).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
    }

    private JsonNode commandById(SimulatedCube cube, JsonNode command) throws Exception {
        JsonNode commands = json(mockMvc.perform(get("/api/devices/" + cube.deviceId() + "/commands").with(as(OWNER))).andReturn());
        for (JsonNode candidate : commands) {
            if (candidate.get("commandId").asText().equals(command.get("commandId").asText())) {
                return candidate;
            }
        }
        throw new AssertionError("command not found");
    }

    private String commandStatus(SimulatedCube cube, JsonNode command) throws Exception {
        return commandById(cube, command).get("status").asText();
    }
}
