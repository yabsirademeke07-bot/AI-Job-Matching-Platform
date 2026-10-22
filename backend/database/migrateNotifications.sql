ALTER TABLE notifications MODIFY COLUMN type VARCHAR(40) NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(40) NULL AFTER message;
ALTER TABLE notifications ADD COLUMN reference_id INT NULL AFTER reference_type;
UPDATE notifications SET type = 'SHORTLIST' WHERE (type IS NULL OR type = '') AND reference_type = 'TALENT_POOL';
ALTER TABLE notifications ADD INDEX idx_notifications_created (created_at);
ALTER TABLE notifications ADD INDEX idx_notifications_reference (reference_type, reference_id);
