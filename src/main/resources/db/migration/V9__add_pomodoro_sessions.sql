-- History of finished and interrupted Pomodoro sessions, from the browser timer or a physical cube.

CREATE TABLE pomodoro_sessions (
    session_row_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    device_id BIGINT,
    external_id UUID NOT NULL,
    session_type VARCHAR(16) NOT NULL
        CHECK (session_type IN ('WORK', 'SHORT_BREAK', 'LONG_BREAK')),
    source VARCHAR(10) NOT NULL
        CHECK (source IN ('WEB', 'DEVICE')),
    status VARCHAR(12) NOT NULL
        CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'INTERRUPTED')),
    planned_duration_seconds INT NOT NULL CHECK (planned_duration_seconds > 0),
    actual_duration_seconds INT NOT NULL DEFAULT 0 CHECK (actual_duration_seconds >= 0),
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_pomodoro_sessions_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_pomodoro_sessions_device FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE SET NULL,
    CONSTRAINT uq_pomodoro_sessions_external UNIQUE (user_id, external_id)
);

CREATE INDEX idx_pomodoro_sessions_user_started ON pomodoro_sessions (user_id, started_at DESC);
