package com.example.telos.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Real server + real form login + real WebSocket client: proves the live channel of docs/esp32/PROTOCOL.md section 7.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "telos.device.scheduling-enabled=false")
class DeviceWebSocketIntegrationTest extends PostgresIntegrationTest {
    private static final String PASSWORD = "Known-pass-1";

    @LocalServerPort
    private int port;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private record Socket(WebSocketSession session, BlockingQueue<JsonNode> messages) implements AutoCloseable {
        @Override
        public void close() throws Exception {
            session.close();
        }

        /** Next message of the given type matching the condition; other messages are skipped. */
        JsonNode next(String type, Predicate<JsonNode> condition) throws InterruptedException {
            long deadline = System.currentTimeMillis() + 5_000;
            while (System.currentTimeMillis() < deadline) {
                JsonNode message = messages.poll(deadline - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
                if (message != null && type.equals(message.path("type").asText()) && condition.test(message)) {
                    return message;
                }
            }
            throw new AssertionError("No " + type + " message arrived within 5 s");
        }

        boolean receivedNothingWithin(long millis) throws InterruptedException {
            return messages.poll(millis, TimeUnit.MILLISECONDS) == null;
        }
    }

    private String createUser(String name) {
        String email = name + "@ws.test";
        jdbcTemplate.update("DELETE FROM users WHERE email = ?", email);
        jdbcTemplate.update("INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
                name, email, passwordEncoder.encode(PASSWORD));
        Long userId = jdbcTemplate.queryForObject("SELECT user_id FROM users WHERE email = ?", Long.class, email);
        jdbcTemplate.update("INSERT INTO user_time_settings (user_id, pomodoro_minutes, short_break_minutes, "
                + "long_break_minutes, pomo_cycles, sounds_enable) VALUES (?, 25, 5, 15, 4, true)", userId);
        return email;
    }

    /** Logs in through the real login form and returns the session cookie header value. */
    private String login(String email) throws Exception {
        CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();
        URI loginUri = URI.create("http://localhost:" + port + "/login");

        String html = client.send(HttpRequest.newBuilder(loginUri).GET().build(), HttpResponse.BodyHandlers.ofString()).body();
        Matcher csrfToken = Pattern.compile("name=\"_csrf\" value=\"([^\"]+)\"").matcher(html);
        assertThat(csrfToken.find()).as("login form has a CSRF token").isTrue();

        String form = "username=" + URLEncoder.encode(email, StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(PASSWORD, StandardCharsets.UTF_8)
                + "&_csrf=" + URLEncoder.encode(csrfToken.group(1), StandardCharsets.UTF_8);
        HttpResponse<Void> response = client.send(HttpRequest.newBuilder(loginUri)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build(), HttpResponse.BodyHandlers.discarding());
        assertThat(response.headers().firstValue("Location").orElse("")).doesNotContain("error");

        HttpCookie session = cookies.getCookieStore().getCookies().stream()
                .filter(cookie -> cookie.getName().equals("JSESSIONID"))
                .findFirst()
                .orElseThrow();
        return session.getName() + "=" + session.getValue();
    }

    private Socket connect(String cookie, String origin) throws Exception {
        BlockingQueue<JsonNode> messages = new LinkedBlockingQueue<>();
        TextWebSocketHandler handler = new TextWebSocketHandler() {
            @Override
            protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
                messages.add(objectMapper.readTree(message.getPayload()));
            }
        };
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        if (cookie != null) {
            headers.add(HttpHeaders.COOKIE, cookie);
        }
        headers.add(HttpHeaders.ORIGIN, origin);
        WebSocketSession session = new StandardWebSocketClient()
                .execute(handler, headers, URI.create("ws://localhost:" + port + "/ws/devices"))
                .get(5, TimeUnit.SECONDS);
        return new Socket(session, messages);
    }

    private String sameOrigin() {
        return "http://localhost:" + port;
    }

    private SimulatedCube pairCube(String email, String hardwareId) throws Exception {
        String body = mockMvc.perform(post("/api/device-pairings").with(user(email).roles("USER")).with(csrf()))
                .andReturn().getResponse().getContentAsString();
        SimulatedCube cube = new SimulatedCube(mockMvc, objectMapper, clock, hardwareId);
        cube.pair(objectMapper.readTree(body).get("pairingToken").asText());
        return cube;
    }

    @Test
    void ownerReceivesTimerStateAndCommandLifecycle() throws Exception {
        String email = createUser("wsowner1");
        String cookie = login(email);
        SimulatedCube cube = pairCube(email, "WSCUBE000001");

        try (Socket socket = connect(cookie, sameOrigin())) {
            cube.flip("WORK").flush();
            JsonNode state = socket.next("TIMER_STATE", message -> true);
            assertThat(state.get("deviceId").asLong()).isEqualTo(cube.deviceId());
            assertThat(state.at("/state/status").asText()).isEqualTo("RUNNING");
            assertThat(state.at("/state/version").asLong()).isEqualTo(1);

            mockMvc.perform(post("/api/devices/" + cube.deviceId() + "/commands")
                    .with(user(email).roles("USER")).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"type\":\"PAUSE\"}"));
            socket.next("COMMAND", message -> message.at("/command/status").asText().equals("PENDING"));

            cube.executePendingCommands();
            socket.next("COMMAND", message -> message.at("/command/status").asText().equals("DELIVERED"));
            socket.next("COMMAND", message -> message.at("/command/status").asText().equals("EXECUTED"));
            JsonNode paused = socket.next("TIMER_STATE", message -> message.at("/state/status").asText().equals("PAUSED"));
            assertThat(paused.at("/state/version").asLong()).isEqualTo(2);
        }
    }

    @Test
    void reconnectedSocketReceivesLaterUpdates() throws Exception {
        String email = createUser("wsowner2");
        String cookie = login(email);
        SimulatedCube cube = pairCube(email, "WSCUBE000002");

        connect(cookie, sameOrigin()).close();
        try (Socket again = connect(cookie, sameOrigin())) {
            cube.flip("SHORT_BREAK").flush();
            JsonNode state = again.next("TIMER_STATE", message -> true);
            assertThat(state.at("/state/mode").asText()).isEqualTo("SHORT_BREAK");
        }
    }

    @Test
    void offlineCubeComingBackIsAnnounced() throws Exception {
        String email = createUser("wsowner3");
        String cookie = login(email);
        SimulatedCube cube = pairCube(email, "WSCUBE000003");
        jdbcTemplate.update("UPDATE devices SET status = 'OFFLINE' WHERE device_id = ?", cube.deviceId());

        try (Socket socket = connect(cookie, sameOrigin())) {
            cube.heartbeat();
            JsonNode status = socket.next("DEVICE_STATUS", message -> true);
            assertThat(status.get("status").asText()).isEqualTo("ONLINE");
            assertThat(status.get("lastSeenAt").asLong()).isEqualTo(clock.millis());
        }
    }

    @Test
    void messagesDoNotLeakToOtherUsers() throws Exception {
        String owner = createUser("wsowner4");
        String other = createUser("wsother4");
        String ownerCookie = login(owner);
        String otherCookie = login(other);
        SimulatedCube cube = pairCube(owner, "WSCUBE000004");

        try (Socket ownerSocket = connect(ownerCookie, sameOrigin());
             Socket otherSocket = connect(otherCookie, sameOrigin())) {
            cube.flip("WORK").flush();
            ownerSocket.next("TIMER_STATE", message -> true);
            assertThat(otherSocket.receivedNothingWithin(500)).isTrue();
        }
    }

    @Test
    void logoutClosesTheLiveChannel() throws Exception {
        String email = createUser("wsowner6");
        String cookie = login(email);
        try (Socket socket = connect(cookie, sameOrigin())) {
            HttpClient client = HttpClient.newHttpClient();
            String html = client.send(HttpRequest.newBuilder(URI.create(sameOrigin() + "/")).header("Cookie", cookie).GET().build(),
                    HttpResponse.BodyHandlers.ofString()).body();
            Matcher token = Pattern.compile("name=\"_csrf\" content=\"([^\"]+)\"").matcher(html);
            assertThat(token.find()).isTrue();
            client.send(HttpRequest.newBuilder(URI.create(sameOrigin() + "/logout"))
                    .header("Cookie", cookie)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("_csrf=" + URLEncoder.encode(token.group(1), StandardCharsets.UTF_8)))
                    .build(), HttpResponse.BodyHandlers.discarding());

            long deadline = System.currentTimeMillis() + 5_000;
            while (socket.session().isOpen() && System.currentTimeMillis() < deadline) {
                Thread.onSpinWait();
            }
            assertThat(socket.session().isOpen()).isFalse();
        }
    }

    @Test
    void handshakeWithoutLoginIsRejected() {
        assertThatThrownBy(() -> connect(null, sameOrigin())).isInstanceOf(Exception.class);
    }

    @Test
    void handshakeFromForeignOriginIsRejected() throws Exception {
        String cookie = login(createUser("wsowner5"));
        assertThatThrownBy(() -> connect(cookie, "http://evil.example")).isInstanceOf(Exception.class);
    }
}
