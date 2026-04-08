CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_admin BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE user_time_settings (
    settings_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    pomodoro_minutes INT NOT NULL,
    short_break_minutes INT NOT NULL,
    long_break_minutes INT NOT NULL,
    pomo_cycles INT NOT NULL,
    sounds_enable BOOLEAN NOT NULL,

    CONSTRAINT fk_user_time_settings_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);