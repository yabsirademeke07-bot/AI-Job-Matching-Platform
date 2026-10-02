const db = require('../config/db');

let contactTableReady;
let rateLimitTableReady;

const RATE_LIMIT_MESSAGE = 'የመልእክት ገደብዎ ላይ ደርሰዋል። Adminን ላለመጫን እና አላስፈላጊ መልእክቶችን ለመቀነስ ሲባል በ6 ሰዓት ውስጥ መላክ የሚችሉት 2 መልእክት ብቻ ነው። እባክዎ ከ6 ሰዓት በኋላ እንደገና ይሞክሩ።';

function ensureContactTable() {
  if (!contactTableReady) {
    contactTableReady = db.execute(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('new', 'read', 'replied', 'archived') NOT NULL DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_contact_email (email),
        INDEX idx_contact_status (status),
        INDEX idx_contact_created_at (created_at)
      )
    `).then(() => undefined);
  }
  return contactTableReady;
}

function ensureRateLimitTable() {
  if (!rateLimitTableReady) {
    rateLimitTableReady = db.execute(`
      CREATE TABLE IF NOT EXISTS user_rate_limits (
        user_id VARCHAR(255) PRIMARY KEY,
        message_count INT NOT NULL DEFAULT 0,
        first_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
        restricted_until TIMESTAMP NULL
      )
    `).then(() => undefined);
  }
  return rateLimitTableReady;
}

async function consumeMessageRateLimit(userId) {
  const normalizedUserId = String(userId || '').trim().toLowerCase();
  if (!normalizedUserId) return { allowed: false, message: RATE_LIMIT_MESSAGE };

  await ensureRateLimitTable();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[limit]] = await connection.execute(
      'SELECT user_id, message_count, first_message_at FROM user_rate_limits WHERE user_id = ? FOR UPDATE',
      [normalizedUserId]
    );

    if (!limit) {
      await connection.execute(
        'INSERT INTO user_rate_limits (user_id, message_count, first_message_at, is_restricted, restricted_until) VALUES (?, 1, NOW(), FALSE, NULL)',
        [normalizedUserId]
      );
      await connection.commit();
      return { allowed: true, messageCount: 1 };
    }

    const firstMessageTime = new Date(limit.first_message_at).getTime();
    const elapsedSeconds = Number.isFinite(firstMessageTime)
      ? Math.max(0, Math.floor((Date.now() - firstMessageTime) / 1000))
      : 0;

    if (elapsedSeconds > 6 * 60 * 60) {
      await connection.execute(
        'UPDATE user_rate_limits SET message_count = 1, first_message_at = NOW(), is_restricted = FALSE, restricted_until = NULL WHERE user_id = ?',
        [normalizedUserId]
      );
      await connection.commit();
      return { allowed: true, messageCount: 1 };
    }

    if (Number(limit.message_count) < 2) {
      await connection.execute(
        'UPDATE user_rate_limits SET message_count = message_count + 1, is_restricted = FALSE, restricted_until = NULL WHERE user_id = ?',
        [normalizedUserId]
      );
      await connection.commit();
      return { allowed: true, messageCount: Number(limit.message_count) + 1 };
    }

    const remainingSeconds = Math.max(1, 6 * 60 * 60 - elapsedSeconds);
    await connection.execute(
      'UPDATE user_rate_limits SET is_restricted = TRUE, restricted_until = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE user_id = ?',
      [remainingSeconds, normalizedUserId]
    );
    await connection.commit();
    return { allowed: false, message: RATE_LIMIT_MESSAGE };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createContactMessage({ fullName, email, subject, message }) {
  await ensureContactTable();
  const [result] = await db.execute(
    `INSERT INTO contact_messages (full_name, email, subject, message)
     VALUES (?, ?, ?, ?)`,
    [fullName, email, subject, message]
  );

  return { id: result.insertId };
}

module.exports = { createContactMessage, consumeMessageRateLimit, RATE_LIMIT_MESSAGE };
