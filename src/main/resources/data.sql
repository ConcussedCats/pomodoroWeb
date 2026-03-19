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

INSERT INTO notes (user_id, note_text)
VALUES
    (1, 'Note test text #1'),
    (2, 'Lorem ipsum...'),
    (3, 'I need money'),
    (1, 'Note test text #2'),
    (2, 'I love  my cat and dog'),
    (3, 'Example text'),
    (1, 'I need to pass my exams'),
    (2, 'Buy products: eggs, milk, bread')