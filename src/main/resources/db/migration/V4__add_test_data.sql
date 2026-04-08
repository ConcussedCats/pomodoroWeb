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
    (2, 'Buy products: eggs, milk, bread');

INSERT INTO todos (
    user_id,
    todo_title,
    todo_description,
    is_done,
    todo_priority,
    todo_deadline
) VALUES
-- User 1
(1, 'Finish website backend', 'Complete timer logic and API endpoints', false, 'HIGH', now() + interval '1 day'),
(1, 'Fix security config', 'Resolve CSRF and JWT issues', false, 'HIGH', now() + interval '2 days'),
(1, 'Refactor service layer', 'Improve code structure and readability', true, 'MEDIUM', now() - interval '1 day'),
(1, 'Write unit tests', 'Cover ToDoService with tests', false, 'MEDIUM', now() + interval '3 days'),

-- User 2
(2, 'Buy groceries', 'Milk, eggs, bread, cheese', true, 'LOW', now() - interval '2 hours'),
(2, 'Go to gym', NULL, false, 'MEDIUM', now() + interval '5 hours'),
(2, 'Call client', 'Discuss charter flight details', false, 'HIGH', now() + interval '6 hours'),

-- User 3
(3, 'Prepare Arduino lesson', NULL, false, 'HIGH', now() + interval '1 day'),
(3, 'Create Flexbox slides', 'Lesson materials for students', true, 'LOW', now() - interval '1 day'),
(3, 'Check homework', NULL, false, 'MEDIUM', now() + interval '4 hours'),
(3, 'Plan next lesson', 'Think about next topic', false, 'LOW', now() + interval '2 days');