ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(100) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_telegram_alerts_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD INDEX idx_users_telegram_chat_id (telegram_chat_id);

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS telegram_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS application_updates BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS interview_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS matching_job_recommendations BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS chat_messages BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recipient_role ENUM('seeker', 'employer', 'admin') NOT NULL,
  recipient_chat_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  title VARCHAR(150) NOT NULL,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notification_logs_sent_at (sent_at),
  INDEX idx_notification_logs_event_type (event_type)
);

CREATE TABLE IF NOT EXISTS dispatched_events (
  event_key VARCHAR(120) PRIMARY KEY,
  recipient_id VARCHAR(50) NOT NULL,
  dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_failure_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  recipient_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  error_code VARCHAR(60) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notification_failure_created (created_at),
  INDEX idx_notification_failure_event (event_type)
);

CREATE TABLE IF NOT EXISTS telegram_notification_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  event_type ENUM('deadline_reminder') NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_telegram_job_event_date (job_id, event_type, event_date),
  INDEX idx_telegram_event_date (event_type, event_date)
);

CREATE TABLE IF NOT EXISTS telegram_link_verifications (
  user_id INT PRIMARY KEY,
  chat_id VARCHAR(50) NOT NULL,
  telegram_username VARCHAR(100) NULL,
  code_hash CHAR(64) NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_telegram_verification_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS telegram_bot_link_tokens (
  user_id INT PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_telegram_bot_link_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS telegram_candidate_match_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_telegram_candidate_job_match (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS telegram_admin_daily_stats (
  stat_date DATE PRIMARY KEY,
  status ENUM('sending', 'sent', 'failed') NOT NULL DEFAULT 'sending',
  locked_at DATETIME NOT NULL,
  sent_at DATETIME NULL
);
