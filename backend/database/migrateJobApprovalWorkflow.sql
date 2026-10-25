-- Align job approval and public visibility fields with the application workflow.
-- Existing jobs remain enabled by default, but public queries still require approval.
ALTER TABLE jobs
    MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft';

UPDATE jobs
SET status = CASE
    WHEN LOWER(status) IN ('scheduled', 'pending_approval') THEN 'published'
    WHEN LOWER(status) = 'pending' THEN 'pending'
    WHEN LOWER(status) = 'rejected' THEN 'published'
    WHEN LOWER(status) IN ('approved', 'open') THEN 'active'
    WHEN LOWER(status) = 'inactive' THEN 'paused'
    WHEN LOWER(status) IN ('draft', 'published', 'active', 'paused', 'closed', 'expired') THEN LOWER(status)
    ELSE 'draft'
END;

ALTER TABLE jobs
    MODIFY COLUMN status ENUM('draft', 'pending', 'published', 'active', 'paused', 'closed', 'expired') NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS approved_by INT NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE jobs
    MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    MODIFY COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE;

SET @approval_index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND index_name = 'idx_approval_status'
);
SET @approval_index_sql = IF(
    @approval_index_exists = 0,
    'ALTER TABLE jobs ADD INDEX idx_approval_status (approval_status)',
    'SELECT 1'
);
PREPARE approval_index_statement FROM @approval_index_sql;
EXECUTE approval_index_statement;
DEALLOCATE PREPARE approval_index_statement;

SET @status_index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND index_name = 'idx_status'
);
SET @status_index_sql = IF(@status_index_exists = 0, 'ALTER TABLE jobs ADD INDEX idx_status (status)', 'SELECT 1');
PREPARE status_index_statement FROM @status_index_sql;
EXECUTE status_index_statement;
DEALLOCATE PREPARE status_index_statement;

SET @active_index_exists = (
    SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'jobs' AND index_name = 'idx_is_active'
);
SET @active_index_sql = IF(@active_index_exists = 0, 'ALTER TABLE jobs ADD INDEX idx_is_active (is_active)', 'SELECT 1');
PREPARE active_index_statement FROM @active_index_sql;
EXECUTE active_index_statement;
DEALLOCATE PREPARE active_index_statement;

ALTER TABLE employers
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Preserve prior moderation intent while keeping lifecycle status independent.
UPDATE jobs
SET approval_status = CASE
                WHEN LOWER(COALESCE(approval_status, '')) = 'rejected' OR LOWER(status) = 'rejected' THEN 'rejected'
                WHEN LOWER(COALESCE(approval_status, '')) = 'approved' OR is_approved = TRUE
                    OR LOWER(status) IN ('approved', 'active') THEN 'approved'
                ELSE 'pending'
        END,
        is_approved = CASE
                WHEN LOWER(COALESCE(approval_status, '')) = 'rejected' OR LOWER(status) = 'rejected' THEN FALSE
                WHEN LOWER(COALESCE(approval_status, '')) = 'approved' OR is_approved = TRUE
                    OR LOWER(status) IN ('approved', 'active') THEN TRUE
                ELSE FALSE
        END,
        approved_at = CASE
                WHEN LOWER(COALESCE(approval_status, '')) = 'approved' OR is_approved = TRUE
                    OR LOWER(status) IN ('approved', 'active') THEN COALESCE(approved_at, published_at, updated_at, NOW())
                ELSE NULL
        END;

UPDATE jobs
SET status = CASE
            WHEN LOWER(status) = 'approved' THEN 'active'
            WHEN LOWER(status) IN ('scheduled', 'pending', 'pending_approval', 'rejected') THEN 'published'
            ELSE status
        END,
        is_active = CASE
            WHEN approval_status = 'approved' AND LOWER(status) IN ('approved', 'active', 'published') THEN TRUE
            ELSE FALSE
        END;
