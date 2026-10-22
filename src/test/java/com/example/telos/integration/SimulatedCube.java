package com.example.telos.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Software ESP32 used by the integration tests. It speaks the HTTP protocol of docs/esp32/PROTOCOL.md
 * and applies the cube face rules locally, like the firmware would while offline.
 * It proves the server side of the protocol, not the behaviour of the real hardware.
 */
public class SimulatedCube {
    private final MockMvc mockMvc;
    private final ObjectMapper objectMapper;
    private final MutableClock clock;
    private final String hardwareId;
    private final List<Map<String, Object>> outbox = new ArrayList<>();

    private String secret;
    private Long deviceId;
    private String bootId = UUID.randomUUID().toString().substring(0, 8);
    private long seq;

    private int workSeconds = 25 * 60;
    private int shortBreakSeconds = 5 * 60;
    private int longBreakSeconds = 15 * 60;

    private String mode = "WORK";
    private String status = "STOPPED";
    private int durationSeconds = workSeconds;
    private int remainingSeconds = workSeconds;
    private Long startedAt;
    private Long pausedAt;
    private UUID sessionId;

    public SimulatedCube(MockMvc mockMvc, ObjectMapper objectMapper, MutableClock clock, String hardwareId) {
        this.mockMvc = mockMvc;
        this.objectMapper = objectMapper;
        this.clock = clock;
        this.hardwareId = hardwareId;
    }

    // ------------------------------------------------------------- protocol calls

    public MvcResult pair(String pairingToken) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("pairingToken", pairingToken);
        body.put("hardwareId", hardwareId);
        body.put("firmwareVersion", "0.1.0-sim");
        body.put("protocolVersion", 1);
        body.put("capabilities", Map.of("vibration", true, "sound", true, "rgb", false));
        MvcResult result = mockMvc.perform(post("/api/devices/pair")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
        if (result.getResponse().getStatus() == 201) {
            JsonNode json = json(result);
            secret = json.get("deviceSecret").asText();
            deviceId = json.get("deviceId").asLong();
        }
        return result;
    }

    public MvcResult heartbeat() throws Exception {
        return heartbeat(null);
    }

    public MvcResult heartbeat(String configHash) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("firmwareVersion", "0.1.0-sim");
        body.put("protocolVersion", 1);
        body.put("capabilities", Map.of("vibration", true, "sound", true, "rgb", false));
        body.put("metrics", Map.of("wifiRssi", -60, "uptimeSeconds", 120, "batteryPercent", 99));
        body.put("state", snapshot());
        if (configHash != null) {
            body.put("configHash", configHash);
        }
        return mockMvc.perform(authorized(post("/api/devices/heartbeat"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
    }

    public MvcResult fetchConfig() throws Exception {
        MvcResult result = mockMvc.perform(authorized(get("/api/device/config"))).andReturn();
        if (result.getResponse().getStatus() == 200) {
            JsonNode timer = json(result).get("timer");
            workSeconds = timer.get("pomodoroMinutes").asInt() * 60;
            shortBreakSeconds = timer.get("shortBreakMinutes").asInt() * 60;
            longBreakSeconds = timer.get("longBreakMinutes").asInt() * 60;
        }
        return result;
    }

    /** Sends every queued event; returns the server response (events stay queued on failure). */
    public MvcResult flush() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("bootId", bootId);
        body.put("events", new ArrayList<>(outbox));
        MvcResult result = mockMvc.perform(authorized(post("/api/device/events"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
        if (result.getResponse().getStatus() == 200) {
            outbox.clear();
        }
        return result;
    }

    public MvcResult sendRaw(Map<String, Object> batch) throws Exception {
        return mockMvc.perform(authorized(post("/api/device/events"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batch)))
                .andReturn();
    }

    public JsonNode pollCommands() throws Exception {
        return json(mockMvc.perform(authorized(get("/api/device/commands"))).andReturn()).get("commands");
    }

    public MvcResult ack(String commandId, String result, String errorCode) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("result", result);
        body.put("errorCode", errorCode);
        body.put("state", snapshot());
        return mockMvc.perform(authorized(post("/api/device/commands/" + commandId + "/ack"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn();
    }

    /** Polls, executes every command locally and acks it, like the firmware loop. */
    public void executePendingCommands() throws Exception {
        for (JsonNode command : pollCommands()) {
            String type = command.get("type").asText();
            String targetMode = command.get("mode").isNull() ? null : command.get("mode").asText();
            boolean executed = execute(type, targetMode, command.path("targetState"));
            ack(command.get("commandId").asText(), executed ? "EXECUTED" : "REJECTED", executed ? null : "INVALID_STATE");
        }
    }

    public MockHttpServletRequestBuilder authorized(MockHttpServletRequestBuilder builder) {
        return builder.header("Authorization", "Device " + secret).header("X-Device-Id", hardwareId);
    }

    // ------------------------------------------------------------- local behaviour (offline capable)

    /** Flip to a face: queue FACE_CHANGED with the state after the face rule was applied. */
    public SimulatedCube flip(String face) {
        long now = clock.millis();
        switch (face) {
            case "WORK", "SHORT_BREAK", "LONG_BREAK" -> {
                if (mode.equals(face) && status.equals("PAUSED")) {
                    resume(now);
                } else if (!(mode.equals(face) && status.equals("RUNNING"))) {
                    start(face, now);
                }
            }
            case "PAUSE" -> {
                if (status.equals("RUNNING")) {
                    pause(now);
                }
            }
            default -> {
                // DISPLAY and TECH change nothing
            }
        }
        queue("FACE_CHANGED", face, snapshot());
        return this;
    }

    /** Called when the countdown reaches zero on the cube. */
    public SimulatedCube finish() {
        remainingSeconds = 0;
        status = "FINISHED";
        startedAt = null;
        pausedAt = null;
        queue("TIMER_FINISHED", null, snapshot());
        return this;
    }

    public void queue(String type, String face, Map<String, Object> state) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("eventId", UUID.randomUUID().toString());
        event.put("seq", ++seq);
        event.put("type", type);
        event.put("face", face);
        event.put("occurredAt", clock.millis());
        event.put("state", state);
        outbox.add(event);
    }

    public void reboot() {
        bootId = UUID.randomUUID().toString().substring(0, 8);
        seq = 0;
    }

    private boolean execute(String type, String targetMode, JsonNode target) {
        long now = clock.millis();
        switch (type) {
            case "SET_STATE" -> {
                // Continue the browser phase; count to endsAt so a late delivery ends at the same moment.
                mode = targetMode;
                durationSeconds = target.get("durationSeconds").asInt();
                sessionId = UUID.fromString(target.get("sessionId").asText());
                if (target.get("status").asText().equals("RUNNING")) {
                    long endsAt = target.get("endsAt").asLong();
                    status = "RUNNING";
                    remainingSeconds = (int) Math.max(0, (endsAt - now + 999) / 1000);
                    startedAt = endsAt - remainingSeconds * 1000L;
                    pausedAt = null;
                } else {
                    status = "PAUSED";
                    remainingSeconds = target.get("remainingSeconds").asInt();
                    startedAt = null;
                    pausedAt = now;
                }
            }
            case "RELEASE" -> {
                status = "STOPPED";
                durationSeconds = durationOf(mode);
                remainingSeconds = durationSeconds;
                startedAt = null;
                pausedAt = null;
                sessionId = null;
            }
            case "START", "SWITCH_MODE" -> start(targetMode, now);
            case "PAUSE" -> {
                if (!status.equals("RUNNING")) return false;
                pause(now);
            }
            case "RESUME" -> {
                if (!status.equals("PAUSED")) return false;
                resume(now);
            }
            case "STOP" -> {
                status = "STOPPED";
                durationSeconds = durationOf(mode);
                remainingSeconds = durationSeconds;
                startedAt = null;
                pausedAt = null;
                sessionId = null;
            }
            default -> {
                return false;
            }
        }
        return true;
    }

    private void start(String newMode, long now) {
        mode = newMode;
        status = "RUNNING";
        durationSeconds = durationOf(newMode);
        remainingSeconds = durationSeconds;
        startedAt = now;
        pausedAt = null;
        sessionId = UUID.randomUUID();
    }

    private void pause(long now) {
        remainingSeconds = currentRemaining(now);
        status = "PAUSED";
        startedAt = null;
        pausedAt = now;
    }

    private void resume(long now) {
        status = "RUNNING";
        startedAt = now;
        pausedAt = null;
    }

    private int currentRemaining(long now) {
        if (!status.equals("RUNNING") || startedAt == null) {
            return remainingSeconds;
        }
        long left = remainingSeconds * 1000L - (now - startedAt);
        return (int) Math.max(0, (left + 999) / 1000);
    }

    private int durationOf(String timerMode) {
        return switch (timerMode) {
            case "SHORT_BREAK" -> shortBreakSeconds;
            case "LONG_BREAK" -> longBreakSeconds;
            default -> workSeconds;
        };
    }

    public Map<String, Object> snapshot() {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("mode", mode);
        state.put("status", status);
        state.put("durationSeconds", durationSeconds);
        state.put("remainingSeconds", remainingSeconds);
        state.put("startedAt", startedAt);
        state.put("pausedAt", pausedAt);
        state.put("sessionId", sessionId == null ? null : sessionId.toString());
        state.put("endsAt", status.equals("RUNNING") && startedAt != null ? startedAt + remainingSeconds * 1000L : null);
        return state;
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    public Long deviceId() {
        return deviceId;
    }

    public String secret() {
        return secret;
    }

    public String hardwareId() {
        return hardwareId;
    }

    public UUID sessionId() {
        return sessionId;
    }

    public List<Map<String, Object>> outbox() {
        return outbox;
    }

    public String bootId() {
        return bootId;
    }
}
