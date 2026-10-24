package com.example.telos.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class PomodoroHistoryIntegrationTest extends DeviceIntegrationTestSupport {
    private Map<String, Object> session(UUID id, String type, String status, Instant started, int planned, int actual) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("externalId", id); body.put("type", type); body.put("status", status);
        body.put("plannedDurationSeconds", planned); body.put("actualDurationSeconds", actual);
        body.put("startedAt", started.toEpochMilli()); body.put("finishedAt", started.plusSeconds(actual).toEpochMilli());
        return body;
    }
    private MvcResult record(String owner, Map<String, Object> body) throws Exception {
        return mockMvc.perform(post("/api/pomodoro-sessions").with(as(owner)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body))).andReturn();
    }

    @Test void recordsWebSessionsIdempotentlyAndPaginatesNewestFirstPerUser() throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> first = session(id, "pomodoro", "COMPLETED", START.minusSeconds(600), 300, 300);
        MvcResult created = record(OWNER, first);
        assertThat(created.getResponse().getStatus()).isEqualTo(201);
        long row = json(created).get("id").asLong();
        MvcResult repeated = record(OWNER, first);
        assertThat(repeated.getResponse().getStatus()).isEqualTo(200);
        assertThat(json(repeated).get("id").asLong()).isEqualTo(row);
        record(OWNER, session(UUID.randomUUID(), "SHORT_BREAK", "COMPLETED", START.minusSeconds(60), 60, 60));
        record(OTHER_USER, session(UUID.randomUUID(), "WORK", "COMPLETED", START.minusSeconds(30), 60, 60));
        JsonNode page = json(mockMvc.perform(get("/api/pomodoro-sessions?page=0&size=1").with(as(OWNER))).andReturn());
        assertThat(page.get("totalItems").asInt()).isEqualTo(2);
        assertThat(page.get("items").get(0).get("type").asText()).isEqualTo("SHORT_BREAK");
        assertThat(json(mockMvc.perform(get("/api/pomodoro-sessions").with(as(OTHER_USER))).andReturn()).get("totalItems").asInt()).isEqualTo(1);
    }

    @Test void rejectsInvalidRequestsAndRequiresAuthenticatedCsrfProtectedPost() throws Exception {
        Instant at = START.minusSeconds(300);
        assertThat(record(OWNER, session(UUID.randomUUID(), "nope", "COMPLETED", at, 60, 60)).getResponse().getStatus()).isEqualTo(400);
        assertThat(record(OWNER, session(UUID.randomUUID(), "WORK", "IN_PROGRESS", at, 60, 60)).getResponse().getStatus()).isEqualTo(400);
        Map<String,Object> backwards = session(UUID.randomUUID(), "WORK", "COMPLETED", at, 60, 60); backwards.put("finishedAt", at.minusSeconds(1).toEpochMilli());
        assertThat(record(OWNER, backwards).getResponse().getStatus()).isEqualTo(400);
        assertThat(record(OWNER, session(UUID.randomUUID(), "WORK", "COMPLETED", START.plusSeconds(121), 60, 60)).getResponse().getStatus()).isEqualTo(400);
        assertThat(record(OWNER, session(UUID.randomUUID(), "WORK", "COMPLETED", at, 60, 121)).getResponse().getStatus()).isEqualTo(400);
        String payload = objectMapper.writeValueAsString(session(UUID.randomUUID(), "WORK", "COMPLETED", at, 60, 60));
        assertThat(mockMvc.perform(post("/api/pomodoro-sessions").with(as(OWNER)).contentType(MediaType.APPLICATION_JSON).content(payload)).andReturn().getResponse().getStatus()).isEqualTo(403);
        assertThat(mockMvc.perform(post("/api/pomodoro-sessions").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(payload)).andReturn().getResponse().getStatus()).isEqualTo(401);
    }

    @Test void calculatesTodayWeekDaysAndTimeZoneBoundary() throws Exception {
        // 23:30 UTC is the following calendar day in Kyiv in October.
        record(OWNER, session(UUID.randomUUID(), "WORK", "COMPLETED", Instant.parse("2026-10-19T23:30:00Z"), 600, 500));
        record(OWNER, session(UUID.randomUUID(), "SHORT_BREAK", "INTERRUPTED", START.minusSeconds(600), 300, 100));
        JsonNode stats = json(mockMvc.perform(get("/api/pomodoro-sessions/stats?tz=Europe/Kyiv").with(as(OWNER))).andReturn());
        assertThat(stats.get("timeZone").asText()).isEqualTo("Europe/Kyiv");
        assertThat(stats.get("today").get("completedWorkSessions").asInt()).isEqualTo(1);
        assertThat(stats.get("today").get("focusSeconds").asInt()).isEqualTo(500);
        assertThat(stats.get("week").get("breakSeconds").asInt()).isEqualTo(100);
        assertThat(stats.get("days")).hasSize(7);
        assertThat(stats.get("days").get(0).get("date").asText()).isLessThan(stats.get("days").get(6).get("date").asText());
        JsonNode invalid = json(mockMvc.perform(get("/api/pomodoro-sessions/stats?tz=Not/AZone").with(as(OWNER))).andReturn());
        assertThat(invalid.get("errorCode").asText()).isEqualTo("INVALID_TIME_ZONE");
    }

    @Test void deviceRowsKeepHistoryWhenDeviceIsUnbound() throws Exception {
        SimulatedCube cube = pairedCube(OWNER, "HISTORY00001");
        cube.flip("WORK").flush(); cube.finish().flush();
        JsonNode history = json(mockMvc.perform(get("/api/pomodoro-sessions").with(as(OWNER))).andReturn());
        assertThat(history.get("items").get(0).get("source").asText()).isEqualTo("DEVICE");
        assertThat(history.get("items").get(0).get("deviceId").asLong()).isEqualTo(cube.deviceId());
        assertThat(mockMvc.perform(delete("/api/devices/" + cube.deviceId()).with(as(OWNER)).with(csrf())).andReturn().getResponse().getStatus()).isEqualTo(204);
        assertThat(json(mockMvc.perform(get("/api/pomodoro-sessions").with(as(OWNER))).andReturn()).get("items").get(0).get("deviceId").isNull()).isTrue();
    }
}
