DROP TABLE IF EXISTS user_time_settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS error_logs;
DROP TABLE IF EXISTS notes;

CREATE TABLE error_logs (
    error_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY UNIQUE,
    http_error INT NOT NULL,
    error_description TEXT NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY UNIQUE,
    username VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    is_admin BOOLEAN NOT NULL DEFAULT false
);

 CREATE TABLE user_time_settings (
    settings_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY UNIQUE,
    user_id INT NOT NULL UNIQUE,
    pomodoro_minutes INT NOT NULL,
    short_break_minutes INT NOT NULL,
    long_break_minutes INT NOT NULL,
    pomo_cycles INT NOT NULL,
    sounds_enable BOOLEAN NOT NULL,

    CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE notes (
    note_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY UNIQUE,
    user_id INT NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);