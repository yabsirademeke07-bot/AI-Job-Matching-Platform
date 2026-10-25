-- Add a consistent salary frequency/type field for new and existing jobs.
SET @salary_type_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'jobs'
      AND column_name = 'salary_type'
);
SET @salary_type_column_sql = IF(
    @salary_type_column_exists = 0,
    'ALTER TABLE jobs ADD COLUMN salary_type VARCHAR(50) NOT NULL DEFAULT ''Monthly''',
    'SELECT 1'
);
PREPARE salary_type_column_statement FROM @salary_type_column_sql;
EXECUTE salary_type_column_statement;
DEALLOCATE PREPARE salary_type_column_statement;
