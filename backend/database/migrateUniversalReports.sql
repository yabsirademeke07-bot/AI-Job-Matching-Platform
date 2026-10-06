ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS reporter_role ENUM('seeker', 'employer', 'admin') NOT NULL DEFAULT 'seeker' AFTER reporter_id;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS target_type ENUM('job', 'candidate', 'employer', 'platform') NOT NULL DEFAULT 'job' AFTER reporter_role;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS target_id INT NULL AFTER target_type;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS issue_category VARCHAR(100) NULL AFTER report_type;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS admin_notes TEXT NULL AFTER resolution_notes;

ALTER TABLE reports
  ADD INDEX idx_reporter_role_created (reporter_role, created_at),
  ADD INDEX idx_target_type_id (target_type, target_id);

UPDATE reports
SET reporter_role = COALESCE(
      (SELECT CASE
         WHEN LOWER(u.role) IN ('employer', 'company', 'recruiter') THEN 'employer'
         WHEN LOWER(u.role) IN ('admin', 'super_admin') THEN 'admin'
         ELSE 'seeker'
       END FROM users u WHERE u.id = reports.reporter_id),
      'seeker'
    ),
    target_type = CASE
      WHEN reported_job_id IS NOT NULL THEN 'job'
      WHEN reported_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM users target_user
        WHERE target_user.id = reports.reported_user_id
          AND LOWER(target_user.role) IN ('employer', 'company', 'recruiter')
      ) THEN 'employer'
      WHEN reported_user_id IS NOT NULL THEN 'candidate'
      ELSE 'platform'
    END,
    target_id = COALESCE(reported_job_id, reported_user_id),
    issue_category = COALESCE(issue_category, report_type);