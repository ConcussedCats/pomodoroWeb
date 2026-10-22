-- Handover of the current phase between the browser timer and the cube (SET_STATE / RELEASE).

ALTER TABLE device_commands DROP CONSTRAINT device_commands_command_type_check;
ALTER TABLE device_commands ADD CONSTRAINT device_commands_command_type_check
    CHECK (command_type IN ('START', 'PAUSE', 'RESUME', 'STOP', 'SWITCH_MODE', 'SET_STATE', 'RELEASE'));

-- The phase the cube must continue (SET_STATE only).
ALTER TABLE device_commands ADD COLUMN target_status VARCHAR(16)
    CHECK (target_status IS NULL OR target_status IN ('RUNNING', 'PAUSED'));
ALTER TABLE device_commands ADD COLUMN target_duration_seconds INT
    CHECK (target_duration_seconds IS NULL OR target_duration_seconds > 0);
ALTER TABLE device_commands ADD COLUMN target_remaining_seconds INT
    CHECK (target_remaining_seconds IS NULL OR target_remaining_seconds >= 0);
ALTER TABLE device_commands ADD COLUMN target_ends_at TIMESTAMPTZ;
ALTER TABLE device_commands ADD COLUMN target_session_id UUID;
ALTER TABLE device_commands ADD COLUMN target_session_started_at TIMESTAMPTZ;
ALTER TABLE device_commands ADD COLUMN target_cycle_index INT;
ALTER TABLE device_commands ADD COLUMN target_phase_index INT;
