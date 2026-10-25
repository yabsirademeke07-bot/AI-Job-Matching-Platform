SET @has_candidate_response = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'interviews'
      AND COLUMN_NAME = 'candidate_response'
);
SET @candidate_response_migration = IF(
    @has_candidate_response = 0,
    "ALTER TABLE interviews ADD COLUMN candidate_response ENUM('pending', 'accepted', 'reschedule_requested', 'declined') DEFAULT 'pending'",
    'SELECT 1'
);
PREPARE application_tracking_stmt FROM @candidate_response_migration;
EXECUTE application_tracking_stmt;
DEALLOCATE PREPARE application_tracking_stmt;

CREATE TABLE IF NOT EXISTS candidate_application_notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);
