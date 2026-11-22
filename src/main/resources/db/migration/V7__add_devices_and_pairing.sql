-- Physical Pomodoro Flip Cube devices, one-time pairing sessions and per-device hardware settings.

CREATE TABLE devices (
    device_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hardware_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    name VARCHAR(40) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'OFFLINE'
        CHECK (status IN ('ONLINE', 'OFFLINE')),
    device_secret_hash CHAR(64) NOT NULL,
    firmware_version VARCHAR(32),
    protocol_version INT,
    capabilities TEXT,
    metrics TEXT,
    last_face VARCHAR(16),
    applied_config_hash VARCHAR(64),
    last_seen_at TIMESTAMPTZ,
    secret_rotated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_devices_hardware_id UNIQUE (hardware_id),
    CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_devices_user_id ON devices (user_id);
CREATE INDEX idx_devices_status_last_seen ON devices (status, last_seen_at);

CREATE TABLE device_pairings (
    pairing_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    pairing_token_hash CHAR(64) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'CREATED'
        CHECK (status IN ('CREATED', 'CLAIMED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    claimed_device_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_device_pairings_token_hash UNIQUE (pairing_token_hash),
    CONSTRAINT fk_device_pairings_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_device_pairings_device FOREIGN KEY (claimed_device_id) REFERENCES devices (device_id) ON DELETE SET NULL
);

CREATE INDEX idx_device_pairings_user_status ON device_pairings (user_id, status);

CREATE TABLE device_settings (
    device_id BIGINT PRIMARY KEY,
    vibration_enabled BOOLEAN NOT NULL DEFAULT true,
    sound_enabled BOOLEAN NOT NULL DEFAULT true,
    rgb_brightness INT NOT NULL DEFAULT 60
        CHECK (rgb_brightness BETWEEN 0 AND 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_device_settings_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
);
