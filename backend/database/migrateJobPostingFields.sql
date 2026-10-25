-- Add only missing columns to the existing MySQL jobs table.
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'work_address'
);
SET @ddl = IF(@column_exists = 0, 'ALTER TABLE jobs ADD COLUMN work_address VARCHAR(255) NULL', 'SELECT 1');
PREPARE job_column_statement FROM @ddl;
EXECUTE job_column_statement;
DEALLOCATE PREPARE job_column_statement;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'sub_sectors'
);
SET @ddl = IF(@column_exists = 0, 'ALTER TABLE jobs ADD COLUMN sub_sectors TEXT NULL', 'SELECT 1');
PREPARE job_column_statement FROM @ddl;
EXECUTE job_column_statement;
DEALLOCATE PREPARE job_column_statement;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'vacancies'
);
SET @ddl = IF(@column_exists = 0, 'ALTER TABLE jobs ADD COLUMN vacancies INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE job_column_statement FROM @ddl;
EXECUTE job_column_statement;
DEALLOCATE PREPARE job_column_statement;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'education_qualification'
);
SET @ddl = IF(@column_exists = 0, 'ALTER TABLE jobs ADD COLUMN education_qualification VARCHAR(100) NOT NULL DEFAULT ''Bachelor''''s Degree''', 'SELECT 1');
PREPARE job_column_statement FROM @ddl;
EXECUTE job_column_statement;
DEALLOCATE PREPARE job_column_statement;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'applicants_needed'
);
SET @ddl = IF(@column_exists = 0, 'ALTER TABLE jobs ADD COLUMN applicants_needed VARCHAR(50) NOT NULL DEFAULT ''Both''', 'SELECT 1');
PREPARE job_column_statement FROM @ddl;
EXECUTE job_column_statement;
DEALLOCATE PREPARE job_column_statement;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'category'
);
SET @ddl = IF(@column_exists = 0, 'ALTER TABLE jobs ADD COLUMN category VARCHAR(100) NOT NULL DEFAULT ''General''', 'SELECT 1');
PREPARE job_column_statement FROM @ddl;
EXECUTE job_column_statement;
DEALLOCATE PREPARE job_column_statement;

SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND column_name = 'salary_type'
);
SET @ddl = IF(@column_exists = 0, 'ALTER TABLE jobs ADD COLUMN salary_type VARCHAR(50) NOT NULL DEFAULT ''Monthly''', 'SELECT 1');
PREPARE job_column_statement FROM @ddl;
EXECUTE job_column_statement;
DEALLOCATE PREPARE job_column_statement;
