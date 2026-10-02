ALTER TABLE messages ADD COLUMN receiver_id INT NULL AFTER sender_id;
ALTER TABLE messages ADD INDEX idx_sender_id (sender_id);
ALTER TABLE messages ADD INDEX idx_receiver_id (receiver_id);
ALTER TABLE messages ADD INDEX idx_message_created_at (created_at);