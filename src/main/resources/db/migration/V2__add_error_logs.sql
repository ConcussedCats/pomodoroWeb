CREATE TABLE error_logs (
    error_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    http_error INT NOT NULL,
    error_description TEXT NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT now()
);