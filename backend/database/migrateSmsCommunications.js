const db = require('../connection');

async function migrate() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sms_notification_preferences (
        user_id INT NOT NULL PRIMARY KEY,
        sms_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sms_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sms_communications (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL,
        sender_employer_id INT NOT NULL,
        recipient_seeker_id INT NOT NULL,
        message_body VARCHAR(160) NOT NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        delivery_status VARCHAR(20) NOT NULL,
        provider_message_id VARCHAR(100) NULL,
        communication_type VARCHAR(20) NOT NULL DEFAULT 'employer',
        parent_communication_id BIGINT NULL,
        CONSTRAINT fk_sms_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        CONSTRAINT fk_sms_sender FOREIGN KEY (sender_employer_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_sms_recipient FOREIGN KEY (recipient_seeker_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_sms_parent FOREIGN KEY (parent_communication_id) REFERENCES sms_communications(id) ON DELETE SET NULL,
        INDEX idx_sms_recipient_sent (recipient_seeker_id, sent_at),
        INDEX idx_sms_application_sent (application_id, sent_at),
        UNIQUE KEY uq_sms_parent_reply (parent_communication_id)
      )
    `);
    const [replyIndexes] = await db.execute(
      `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sms_communications'
         AND INDEX_NAME = 'uq_sms_parent_reply' LIMIT 1`,
    );
    if (!replyIndexes.length) {
      await db.execute('CREATE UNIQUE INDEX uq_sms_parent_reply ON sms_communications (parent_communication_id)');
    }
    console.log('SMS communications schema is ready.');
  } catch (error) {
    console.error('SMS communications migration failed:', error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

migrate();
