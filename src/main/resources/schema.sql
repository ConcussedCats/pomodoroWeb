DROP TABLE IF EXISTS user_time_settings;
DROP TABLE IF EXISTS error_logs;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS todos;
DROP TABLE IF EXISTS users;

CREATE TABLE error_logs (
    error_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    http_error INT NOT NULL,
    error_description TEXT NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT now()
);

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

CREATE TABLE notes (
    note_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE TABLE todos (
    todo_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    todo_title VARCHAR(255) NOT NULL,
    todo_description TEXT,
    is_done BOOLEAN NOT NULL DEFAULT false,
    todo_priority VARCHAR(10) NOT NULL
                   CHECK (todo_priority IN ('LOW','MEDIUM','HIGH')),
    todo_deadline TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_todos_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_time_settings ON user_time_settings(user_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_todos_user_id ON todos(user_id);