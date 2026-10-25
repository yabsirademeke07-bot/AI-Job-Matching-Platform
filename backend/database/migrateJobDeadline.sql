-- Add a date-only deadline while preserving compatibility with application_deadline.
SET @deadline_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'jobs'
      AND column_name = 'deadline'
);
SET @deadline_column_sql = IF(
    @deadline_column_exists = 0,
    'ALTER TABLE jobs ADD COLUMN deadline DATE NULL',
    'SELECT 1'
);
PREPARE deadline_column_statement FROM @deadline_column_sql;
EXECUTE deadline_column_statement;
DEALLOCATE PREPARE deadline_column_statement;

UPDATE jobs
SET deadline = application_deadline
WHERE deadline IS NULL
  AND application_deadline IS NOT NULL;

SET @deadline_index_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'jobs'
      AND index_name = 'idx_jobs_deadline'
);
SET @deadline_index_sql = IF(
    @deadline_index_exists = 0,
    'ALTER TABLE jobs ADD INDEX idx_jobs_deadline (deadline)',
    'SELECT 1'
);
PREPARE deadline_index_statement FROM @deadline_index_sql;
EXECUTE deadline_index_statement;
DEALLOCATE PREPARE deadline_index_statement;
