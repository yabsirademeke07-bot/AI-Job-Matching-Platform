ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS evidence_url VARCHAR(512) NULL AFTER description;

ALTER TABLE reports
  MODIFY COLUMN report_type ENUM('inappropriate-content', 'spam', 'fraud', 'offensive-language', 'payment-issue', 'fake-profile', 'other') NOT NULL;

CREATE TABLE IF NOT EXISTS report_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    sender_type ENUM('admin', 'user') NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_report_messages_thread (report_id, created_at, id),
    INDEX idx_report_messages_sender (sender_type, sender_id)
);