ALTER TABLE user_activity_log
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL AFTER activity_type;

ALTER TABLE user_activity_log
  ADD COLUMN IF NOT EXISTS details JSON NULL AFTER description;

UPDATE user_activity_log
SET description = CASE activity_type
  WHEN 'login' THEN 'User signed in'
  WHEN 'role_selected' THEN 'User selected a role'
  WHEN 'profile-update' THEN 'Updated profile information'
  WHEN 'job-apply' THEN 'Applied for a job'
  WHEN 'job-view' THEN 'Viewed a job listing'
  WHEN 'profile-view' THEN 'Viewed a profile'
  WHEN 'message-sent' THEN 'Sent a message'
  WHEN 'cv-upload' THEN 'Uploaded a CV'
  ELSE REPLACE(activity_type, '-', ' ')
END
WHERE description IS NULL;

CREATE INDEX idx_activity_type_created ON user_activity_log (activity_type, created_at);