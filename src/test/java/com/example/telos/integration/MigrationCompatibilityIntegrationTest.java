package com.example.telos.integration;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** V7..V9 applied on top of V1..V6 keep the existing data and add the declared constraints. */
class MigrationCompatibilityIntegrationTest extends PostgresIntegrationTest {

    private static Timestamp now() {
        return Timestamp.from(Instant.now());
    }

    private Long createUser(String name) {
        String email = name + "@migration.test";
        jdbcTemplate.update("DELETE FROM users WHERE email = ?", email);
        jdbcTemplate.update("INSERT INTO users (username, email, password) VALUES (?, ?, 'x')", name, email);
        return jdbcTemplate.queryForObject("SELECT user_id FROM users WHERE email = ?", Long.class, email);
    }

    private Long createDevice(Long userId, String hardwareId) {
        jdbcTemplate.update("INSERT INTO devices (hardware_id, user_id, name, device_secret_hash) VALUES (?, ?, 'cube', repeat('a', 64))",
                hardwareId, userId);
        return jdbcTemplate.queryForObject("SELECT device_id FROM devices WHERE hardware_id = ?", Long.class, hardwareId);
    }

    @Test
    void allMigrationsAppliedAndExistingDataKept() {
        assertThat(jdbcTemplate.queryForList(
                "SELECT version FROM flyway_schema_history WHERE success AND version IS NOT NULL ORDER BY installed_rank",
                String.class)).containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9");

        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM users WHERE email IN ('user@test.com', 'guest@test.com', 'demo@test.com')",
                Integer.class)).isEqualTo(3);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM todos WHERE user_id = 1", Integer.class)).isEqualTo(4);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM notes WHERE user_id = 1", Integer.class)).isEqualTo(3);
        assertThat(jdbcTemplate.queryForObject("SELECT pattern_type FROM user_time_settings WHERE user_id = 1", String.class))
                .isEqualTo("classic");
        assertThat(jdbcTemplate.queryForObject(
                "SELECT count(*) FROM information_schema.tables WHERE table_name IN "
                        + "('devices', 'device_pairings', 'device_settings', 'device_timer_states', "
                        + "'device_commands', 'device_events', 'pomodoro_sessions')",
                Integer.class)).isEqualTo(7);
    }

    @Test
    void hardwareIdIsUnique() {
        Long userId = createUser("mig_hw");
        createDevice(userId, "UNIQUEHW01");
        assertThatThrownBy(() -> createDevice(userId, "UNIQUEHW01")).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deviceEventIdIsUniquePerDevice() {
        Long deviceId = createDevice(createUser("mig_event"), "EVENTHW01");
        UUID eventId = UUID.randomUUID();
        String insert = "INSERT INTO device_events (device_id, event_id, event_type, result, occurred_at) "
                + "VALUES (?, ?, 'FACE_CHANGED', 'APPLIED', ?)";
        jdbcTemplate.update(insert, deviceId, eventId, now());
        assertThatThrownBy(() -> jdbcTemplate.update(insert, deviceId, eventId, now()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void sessionExternalIdIsUniquePerUserAndSurvivesDeviceDeletion() {
        Long userId = createUser("mig_session");
        Long deviceId = createDevice(userId, "SESSIONHW01");
        UUID externalId = UUID.randomUUID();
        String insert = "INSERT INTO pomodoro_sessions (user_id, device_id, external_id, session_type, source, status, "
                + "planned_duration_seconds, started_at) VALUES (?, ?, ?, 'WORK', 'DEVICE', 'COMPLETED', 60, ?)";
        jdbcTemplate.update(insert, userId, deviceId, externalId, now());
        assertThatThrownBy(() -> jdbcTemplate.update(insert, userId, null, externalId, now()))
                .isInstanceOf(DataIntegrityViolationException.class);

        jdbcTemplate.update("DELETE FROM devices WHERE device_id = ?", deviceId);
        assertThat(jdbcTemplate.queryForObject("SELECT device_id FROM pomodoro_sessions WHERE external_id = ?",
                Long.class, externalId)).isNull();
    }

    @Test
    void deletingUserRemovesTheirDevicesAndHistory() {
        Long userId = createUser("mig_cascade");
        createDevice(userId, "CASCADEHW01");
        jdbcTemplate.update("INSERT INTO pomodoro_sessions (user_id, external_id, session_type, source, status, "
                + "planned_duration_seconds, started_at) VALUES (?, ?, 'WORK', 'WEB', 'COMPLETED', 60, ?)",
                userId, UUID.randomUUID(), now());

        jdbcTemplate.update("DELETE FROM users WHERE user_id = ?", userId);
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM devices WHERE user_id = ?", Integer.class, userId)).isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM pomodoro_sessions WHERE user_id = ?", Integer.class, userId))
                .isZero();
    }

    @Test
    void invalidStatusValuesAreRejectedByCheckConstraints() {
        Long userId = createUser("mig_check");
        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO devices (hardware_id, user_id, name, status, device_secret_hash) "
                        + "VALUES ('CHECKHW01', ?, 'cube', 'BROKEN', repeat('a', 64))", userId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
