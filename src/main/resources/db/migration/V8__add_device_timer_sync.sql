-- Server-side synchronized timer state, website -> device commands and de-duplicated device events.

CREATE TABLE device_timer_states (
    device_id BIGINT PRIMARY KEY,
    mode VARCHAR(16) NOT NULL DEFAULT 'WORK'
        CHECK (mode IN ('WORK', 'SHORT_BREAK', 'LONG_BREAK')),
    status VARCHAR(16) NOT NULL DEFAULT 'STOPPED'
        CHECK (status IN ('RUNNING', 'PAUSED', 'STOPPED', 'FINISHED')),
    remaining_seconds INT NOT NULL CHECK (remaining_seconds >= 0),
    duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
    started_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    session_id UUID,
    cycle_index INT NOT NULL DEFAULT 0,
    phase_index INT NOT NULL DEFAULT 0,
    last_boot_id VARCHAR(36),
    last_event_seq BIGINT,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_device_timer_states_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
);

CREATE TABLE device_commands (
    command_id UUID PRIMARY KEY,
    device_id BIGINT NOT NULL,
    created_by_user_id INT,
    command_type VARCHAR(16) NOT NULL
        CHECK (command_type IN ('START', 'PAUSE', 'RESUME', 'STOP', 'SWITCH_MODE')),
    target_mode VARCHAR(16)
        CHECK (target_mode IS NULL OR target_mode IN ('WORK', 'SHORT_BREAK', 'LONG_BREAK')),
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'DELIVERED', 'EXECUTED', 'REJECTED', 'EXPIRED')),
    client_request_id VARCHAR(64),
    error_code VARCHAR(64),
    resulting_version BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    CONSTRAINT fk_device_commands_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE,
    CONSTRAINT fk_device_commands_user FOREIGN KEY (created_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
    CONSTRAINT uq_device_commands_client_request UNIQUE (device_id, client_request_id)
);

CREATE INDEX idx_device_commands_device_status ON device_commands (device_id, status, created_at);

CREATE TABLE device_events (
    event_row_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id BIGINT NOT NULL,
    event_id UUID NOT NULL,
    boot_id VARCHAR(36),
    seq BIGINT,
    event_type VARCHAR(20) NOT NULL,
    face VARCHAR(16),
    result VARCHAR(12) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_device_events_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE,
    CONSTRAINT uq_device_events_event UNIQUE (device_id, event_id)
);

CREATE INDEX idx_device_events_received ON device_events (received_at);
