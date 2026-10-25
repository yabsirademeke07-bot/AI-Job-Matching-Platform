-- Legacy one-time migration. Keep lifecycle and moderation state independent.
-- Back up the database before running; MySQL DDL statements auto-commit.

ALTER TABLE jobs
    ADD COLUMN sub_category VARCHAR(100) NULL AFTER category;

UPDATE jobs
SET category = CASE
      WHEN category IS NULL OR TRIM(category) = '' OR LOWER(TRIM(category)) = 'general'
        THEN COALESCE(NULLIF(TRIM(sector), ''), 'General')
      ELSE category
    END,
    sub_category = COALESCE(
      NULLIF(TRIM(sub_category), ''),
      CASE
        WHEN sub_sectors IS NULL OR TRIM(sub_sectors) = '' THEN NULL
        WHEN JSON_VALID(sub_sectors) THEN NULLIF(JSON_UNQUOTE(JSON_EXTRACT(sub_sectors, '$[0]')), '')
        ELSE NULLIF(TRIM(SUBSTRING_INDEX(sub_sectors, ',', 1)), '')
      END
    ),
    is_salary_negotiable = COALESCE(is_negotiable, is_salary_negotiable, TRUE),
    salary_period = CASE
      WHEN LOWER(salary_type) IN ('hourly', 'monthly', 'yearly') THEN LOWER(salary_type)
      WHEN LOWER(salary_period) IN ('hourly', 'monthly', 'yearly') THEN LOWER(salary_period)
      ELSE 'monthly'
    END,
    education_qualification = CASE
      WHEN LOWER(COALESCE(required_education, '')) IN ('any', 'not required', 'none') THEN 'Not Required'
      WHEN LOWER(COALESCE(required_education, '')) = 'high-school' THEN 'High School'
      WHEN LOWER(COALESCE(required_education, '')) = 'associate' THEN 'Diploma / TVET'
      WHEN LOWER(COALESCE(required_education, '')) = 'bachelor' THEN 'Bachelor''s Degree'
      WHEN LOWER(COALESCE(required_education, '')) = 'master' THEN 'Master''s Degree'
      WHEN LOWER(COALESCE(required_education, '')) = 'phd' THEN 'PhD / Doctorate'
      WHEN education_qualification IS NULL OR TRIM(education_qualification) = '' THEN 'Bachelor''s Degree'
      ELSE education_qualification
    END,
    approval_status = CASE
      WHEN LOWER(COALESCE(approval_status, '')) = 'rejected' OR LOWER(status) = 'rejected' THEN 'rejected'
      WHEN LOWER(COALESCE(approval_status, '')) = 'approved' OR is_approved = TRUE OR LOWER(status) = 'approved' THEN 'approved'
      ELSE 'pending'
    END,
    is_approved = CASE
      WHEN LOWER(COALESCE(approval_status, '')) = 'rejected' OR LOWER(status) = 'rejected' THEN FALSE
      WHEN LOWER(COALESCE(approval_status, '')) = 'approved' OR is_approved = TRUE OR LOWER(status) = 'approved' THEN TRUE
      ELSE FALSE
    END,
    approved_at = CASE
      WHEN LOWER(COALESCE(approval_status, '')) = 'approved' OR is_approved = TRUE OR LOWER(status) = 'approved'
        THEN COALESCE(approved_at, published_at, updated_at, NOW())
      ELSE NULL
    END,
    status = CASE
      WHEN LOWER(status) = 'approved' THEN 'active'
      WHEN LOWER(status) IN ('pending', 'pending_approval', 'rejected') THEN 'published'
      WHEN LOWER(status) = 'scheduled' THEN 'published'
      WHEN LOWER(status) IN ('draft', 'published', 'active', 'paused', 'closed', 'expired') THEN LOWER(status)
      WHEN LOWER(status) = 'inactive' THEN 'closed'
      ELSE 'draft'
    END;

ALTER TABLE jobs
    MODIFY COLUMN category VARCHAR(100) NOT NULL DEFAULT 'General',
    MODIFY COLUMN sub_category VARCHAR(100) NULL,
    MODIFY COLUMN state_province VARCHAR(100) NULL,
    MODIFY COLUMN currency VARCHAR(10) DEFAULT 'ETB',
    MODIFY COLUMN salary_period ENUM('hourly', 'monthly', 'yearly') DEFAULT 'monthly',
    MODIFY COLUMN is_salary_negotiable BOOLEAN DEFAULT TRUE,
    MODIFY COLUMN education_qualification VARCHAR(100) NOT NULL DEFAULT 'Bachelor''s Degree',
    MODIFY COLUMN deadline DATE NULL,
    MODIFY COLUMN status ENUM('draft', 'pending', 'published', 'active', 'paused', 'closed', 'expired') NOT NULL DEFAULT 'draft',
    MODIFY COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE,
    MODIFY COLUMN rejection_reason TEXT NULL,
    MODIFY COLUMN reviewed_by INT NULL,
    MODIFY COLUMN reviewed_at TIMESTAMP NULL DEFAULT NULL;

SET @deadline_index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND index_name = 'idx_jobs_deadline'
);
SET @deadline_index_sql = IF(
    @deadline_index_exists = 0,
    'ALTER TABLE jobs ADD INDEX idx_jobs_deadline (deadline)',
    'SELECT 1'
);
PREPARE deadline_index_statement FROM @deadline_index_sql;
EXECUTE deadline_index_statement;
DEALLOCATE PREPARE deadline_index_statement;

ALTER TABLE jobs
    DROP COLUMN sector,
    DROP COLUMN sub_sectors,
    DROP COLUMN application_deadline,
    DROP COLUMN is_negotiable,
    DROP COLUMN required_education,
    DROP COLUMN applicants_needed,
    DROP COLUMN min_experience,
    DROP COLUMN years_of_experience_min,
    DROP COLUMN years_of_experience_max,
    DROP COLUMN salary_type;