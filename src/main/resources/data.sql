INSERT INTO users (username, email, password)
VALUES
    ('user', 'user@test.com', '$2a$10$BKNS1AKDimfsXJf2JKG6B.spn1MUz7TuONVN6rw/0BJQa.hci6eDa'),
    ('guest', 'guest@test.com', '$2a$10$WR/K82uxZbC0IlRfMsTDZu/4VXwar2RpUQcg0TILh9FH33WS4z6ZK'),
    ('demo', 'demo@test.com', '$2a$10$Hm.qp68UZ5SrVp9G8kSupuY3FW9JGIDPi.IvvMzSdja9vm/h669Eu');


INSERT INTO user_time_settings
(user_id, pomodoro_minutes, short_break_minutes, long_break_minutes, pomo_cycles, sounds_enable)
VALUES
    (1, 25, 5, 15, 4, true),
    (2, 30, 5, 20, 4, true),
    (3, 50, 10, 30, 3, false);