ALTER TABLE device_commands DROP CONSTRAINT device_commands_status_check;
ALTER TABLE device_commands ADD CONSTRAINT device_commands_status_check
    CHECK (status IN ('PENDING', 'DELIVERED', 'EXECUTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'));
