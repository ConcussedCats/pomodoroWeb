package com.example.telos.integration;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Instant;

/**
 * Full application against a real PostgreSQL (embedded binaries, no installed database or Docker),
 * with all Flyway migrations V1..latest applied exactly like in production.
 * The demo users from V4 (user@test.com = id 1, guest@test.com = id 2) are available.
 */
@SpringBootTest(properties = {
        "telos.device.scheduling-enabled=false",
        "spring.jpa.open-in-view=false"
})
@AutoConfigureMockMvc
@Import(PostgresIntegrationTest.TestClockConfig.class)
public abstract class PostgresIntegrationTest {
    public static final Instant START = Instant.parse("2026-10-20T09:00:00Z");

    private static final EmbeddedPostgres POSTGRES = startPostgres();

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected MutableClock clock;

    private static EmbeddedPostgres startPostgres() {
        try {
            EmbeddedPostgres postgres = EmbeddedPostgres.builder().start();
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                try {
                    postgres.close();
                } catch (IOException ignored) {
                    // the JVM is exiting anyway
                }
            }));
            return postgres;
        } catch (IOException exception) {
            throw new UncheckedIOException("Could not start embedded PostgreSQL", exception);
        }
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> POSTGRES.getJdbcUrl("postgres", "postgres"));
        registry.add("spring.datasource.username", () -> "postgres");
        registry.add("spring.datasource.password", () -> "postgres");
    }

    @BeforeEach
    void resetDeviceData() {
        jdbcTemplate.execute("TRUNCATE device_events, device_commands, device_timer_states, device_settings, "
                + "device_pairings, devices, pomodoro_sessions RESTART IDENTITY CASCADE");
        // Back to the V4 demo values for user@test.com, some tests change them.
        jdbcTemplate.update("UPDATE user_time_settings SET pomodoro_minutes = 25, short_break_minutes = 5, "
                + "long_break_minutes = 15, pomo_cycles = 4, sounds_enable = true, pattern_type = 'classic' WHERE user_id = 1");
        clock.set(START);
    }

    @TestConfiguration
    static class TestClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(START);
        }
    }
}
