const express = require('express');
const crypto = require('node:crypto');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');
const {
  getTelegramStatus,
  sendTelegramAlert,
  getTelegramBotUsername,
  handleTelegramUpdate,
  isTelegramWebhookConfigured,
} = require('../services/telegramService');

const router = express.Router();

router.post('/webhook', async (req, res) => {
  const configuredSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET || '');
  const suppliedSecret = String(req.get('x-telegram-bot-api-secret-token') || '');
  const expected = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);
  if (!configuredSecret || expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    return res.sendStatus(401);
  }
  try {
    await handleTelegramUpdate(req.body);
    return res.sendStatus(200);
  } catch (error) {
    console.error('Telegram webhook update failed:', error.message);
    return res.sendStatus(500);
  }
});

router.use(authMiddleware);

router.get('/status', async (req, res) => {
  try {
    const [[user]] = await db.execute(
      `SELECT u.telegram_chat_id, u.telegram_username, u.is_telegram_alerts_active,
              u.is_alerts_enabled,
              COALESCE(p.telegram_alerts_enabled, TRUE) AS telegram_alerts_enabled,
              COALESCE(p.application_updates, TRUE) AS application_updates,
              COALESCE(p.interview_reminders, TRUE) AS interview_reminders,
              COALESCE(p.matching_job_recommendations, FALSE) AS matching_job_recommendations,
              COALESCE(p.chat_messages, TRUE) AS chat_messages
       FROM users u LEFT JOIN notification_preferences p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id],
    );
    if (!user) return res.status(404).json({ success: false, message: 'User account not found.' });
    const status = getTelegramStatus(user);
    return res.json({
      success: true,
      ...status,
      alertsActive: status.alertsActive
        && Number(user.telegram_alerts_enabled) !== 0
        && Number(user.is_alerts_enabled) === 1,
      telegram_alerts_enabled: Number(user.telegram_alerts_enabled) === 1,
      application_updates: Number(user.application_updates) === 1,
      interview_reminders: Number(user.interview_reminders) === 1,
      matching_job_recommendations: Number(user.matching_job_recommendations) === 1,
      chat_messages: Number(user.chat_messages) === 1,
      telegramUsername: user.telegram_username || '',
    });
  } catch (error) {
    console.error('Telegram status lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load Telegram connection status.' });
  }
});

router.post('/link/deep-link', async (req, res) => {
  const username = getTelegramBotUsername();
  if (!username || !isTelegramWebhookConfigured()) {
    return res.status(503).json({ success: false, message: 'Telegram bot and secure webhook are not fully configured.' });
  }
  try {
    const [[user]] = await db.execute('SELECT role FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const role = String(user?.role || '').toLowerCase();
    const linkRole = ['admin', 'super_admin'].includes(role)
      ? 'admin'
      : ['employer', 'recruiter'].includes(role)
        ? 'employer'
        : ['candidate', 'job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(role)
          ? 'candidate'
          : '';
    if (!linkRole) return res.status(403).json({ success: false, message: 'This account role cannot link Telegram notifications.' });
    const token = crypto.randomBytes(24).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.execute(
      `INSERT INTO telegram_bot_link_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash),
         expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE)`,
      [req.user.id, tokenHash],
    );
    return res.json({
      success: true,
      url: `https://t.me/${encodeURIComponent(username)}?start=auth_${req.user.id}_${linkRole}_${token}`,
      message: 'Open Telegram and press Start to link your account. The link expires in 10 minutes.',
    });
  } catch (error) {
    console.error('Telegram deep-link creation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create a Telegram linking link.' });
  }
});

router.post('/link/start', async (req, res) => {
  const chatId = String(req.body?.telegramChatId || '').trim();
  const username = String(req.body?.telegramUsername || '').trim().replace(/^@/, '');
  if (!/^-?\d{1,20}$/.test(chatId)) {
    return res.status(400).json({ success: false, message: 'Telegram chat ID must be a numeric chat ID.' });
  }
  if (username && !/^[A-Za-z0-9_]{5,32}$/.test(username)) {
    return res.status(400).json({ success: false, message: 'Telegram username must be 5-32 letters, numbers, or underscores.' });
  }

  const now = Date.now();
  const [[previousRequest]] = await db.execute(
    'SELECT requested_at FROM telegram_link_verifications WHERE user_id = ? LIMIT 1',
    [req.user.id],
  );
  const lastRequestAt = previousRequest?.requested_at
    ? new Date(previousRequest.requested_at).getTime()
    : 0;
  if (now - lastRequestAt < 30000) {
    return res.status(429).json({ success: false, message: 'Wait before requesting another Telegram verification code.' });
  }

  try {
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    await sendTelegramAlert(
      `Your AI Job Matching Telegram link verification code is ${code}. It expires in 5 minutes.`,
      chatId,
      {
        eventType: 'telegram_link_verification',
        eventKey: `telegram-link-code:${req.user.id}:${codeHash.slice(0, 32)}`,
      },
    );
    await db.execute(
      `INSERT INTO telegram_link_verifications
        (user_id, chat_id, telegram_username, code_hash, attempts, requested_at, expires_at)
       VALUES (?, ?, ?, ?, 0, NOW(), DATE_ADD(NOW(), INTERVAL 5 MINUTE))
       ON DUPLICATE KEY UPDATE chat_id = VALUES(chat_id),
         telegram_username = VALUES(telegram_username), code_hash = VALUES(code_hash),
         attempts = 0, requested_at = NOW(),
         expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE)`,
      [req.user.id, chatId, username || null, codeHash],
    );
    return res.json({ success: true, message: 'Verification code sent to that Telegram chat. Enter the code to complete linking.' });
  } catch (error) {
    console.error('Telegram link verification could not be sent:', error.message);
    return res.status(502).json({ success: false, message: 'Unable to send a Telegram verification code. Start a chat with the bot and try again.' });
  }
});

router.post('/link/confirm', async (req, res) => {
  const code = String(req.body?.code || '').trim();
  const [[pending]] = await db.execute(
    `SELECT chat_id, telegram_username, code_hash, attempts,
            expires_at, expires_at <= NOW() AS is_expired
     FROM telegram_link_verifications WHERE user_id = ? LIMIT 1`,
    [req.user.id],
  );
  if (!pending || Number(pending.is_expired)) {
    await db.execute('DELETE FROM telegram_link_verifications WHERE user_id = ?', [req.user.id]);
    return res.status(400).json({ success: false, message: 'Telegram verification expired. Request a new code.' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, message: 'Enter the six-digit Telegram verification code.' });
  }

  const codeHash = crypto.createHash('sha256').update(code).digest();
  const expectedHash = Buffer.from(pending.code_hash, 'hex');
  const codeMatches = codeHash.length === expectedHash.length
    && crypto.timingSafeEqual(codeHash, expectedHash);
  if (!codeMatches) {
    const attempts = Number(pending.attempts) + 1;
    if (attempts >= 5) {
      await db.execute('DELETE FROM telegram_link_verifications WHERE user_id = ?', [req.user.id]);
    } else {
      await db.execute(
        'UPDATE telegram_link_verifications SET attempts = ? WHERE user_id = ?',
        [attempts, req.user.id],
      );
    }
    return res.status(400).json({
      success: false,
      message: attempts >= 5
        ? 'Too many incorrect codes. Request a new verification code.'
        : 'Telegram verification code is incorrect.',
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE users
       SET telegram_chat_id = ?, telegram_username = ?,
           is_telegram_alerts_active = TRUE, is_alerts_enabled = TRUE
       WHERE id = ?`,
      [pending.chat_id, pending.telegram_username, req.user.id],
    );
    await connection.execute(
      `INSERT INTO notification_preferences (user_id, telegram_alerts_enabled)
       VALUES (?, TRUE)
       ON DUPLICATE KEY UPDATE telegram_alerts_enabled = TRUE`,
      [req.user.id],
    );
    await connection.execute(
      'DELETE FROM telegram_link_verifications WHERE user_id = ?',
      [req.user.id],
    );
    await connection.commit();
    return res.json({ success: true, message: 'Your Telegram chat has been verified and linked.' });
  } catch (error) {
    await connection.rollback();
    console.error('Telegram account link update failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to link this Telegram chat.' });
  } finally {
    connection.release();
  }
});

router.put('/preferences', async (req, res) => {
  const preferenceColumns = [
    'telegram_alerts_enabled',
    'application_updates',
    'interview_reminders',
    'matching_job_recommendations',
    'chat_messages',
  ];
  const preferences = {};
  for (const column of preferenceColumns) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, column)) {
      if (typeof req.body[column] !== 'boolean') {
        return res.status(400).json({ success: false, message: `${column} must be a boolean.` });
      }
      preferences[column] = req.body[column];
    }
  }
  if (req.body?.alertsActive !== undefined && typeof req.body.alertsActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'alertsActive must be a boolean.' });
  }
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    if (req.body?.alertsActive !== undefined) {
      await connection.execute(
        'UPDATE users SET is_telegram_alerts_active = ?, is_alerts_enabled = ? WHERE id = ?',
        [req.body.alertsActive, req.body.alertsActive, req.user.id],
      );
      preferences.telegram_alerts_enabled = req.body.alertsActive;
    }
    if (Object.keys(preferences).length) {
      await connection.execute(
        `INSERT IGNORE INTO notification_preferences (user_id) VALUES (?)`,
        [req.user.id],
      );
      const assignments = Object.keys(preferences).map((column) => `\`${column}\` = ?`).join(', ');
      await connection.execute(
        `UPDATE notification_preferences SET ${assignments} WHERE user_id = ?`,
        [...Object.values(preferences), req.user.id],
      );
    }
    await connection.commit();
    return res.json({ success: true, message: 'Telegram alert preferences saved.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Telegram preference update failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save Telegram alert preferences.' });
  } finally {
    connection?.release();
  }
});

router.get('/preferences', async (req, res) => {
  try {
    const [[preferences]] = await db.execute(
      `SELECT u.is_alerts_enabled AS alertsActive,
              COALESCE(p.telegram_alerts_enabled, FALSE) AS telegram_alerts_enabled,
              COALESCE(p.application_updates, TRUE) AS application_updates,
              COALESCE(p.interview_reminders, TRUE) AS interview_reminders,
              COALESCE(p.matching_job_recommendations, FALSE) AS matching_job_recommendations,
              COALESCE(p.chat_messages, TRUE) AS chat_messages
       FROM users u LEFT JOIN notification_preferences p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id],
    );
    if (!preferences) return res.status(404).json({ success: false, message: 'User account not found.' });
    return res.json({ success: true, preferences });
  } catch (error) {
    console.error('Telegram preference lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load Telegram alert preferences.' });
  }
});

router.delete('/preferences/chat', async (req, res) => {
  try {
    await db.execute(
      `UPDATE users
       SET telegram_chat_id = NULL, telegram_username = NULL,
           is_alerts_enabled = FALSE, is_telegram_alerts_active = FALSE
       WHERE id = ?`,
      [req.user.id],
    );
    await db.execute(
      'UPDATE notification_preferences SET telegram_alerts_enabled = FALSE WHERE user_id = ?',
      [req.user.id],
    );
    await db.execute('DELETE FROM telegram_link_verifications WHERE user_id = ?', [req.user.id]);
    await db.execute('DELETE FROM telegram_bot_link_tokens WHERE user_id = ?', [req.user.id]);
    return res.json({ success: true, message: 'Telegram chat unlinked.' });
  } catch (error) {
    console.error('Telegram account unlink failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to unlink this Telegram chat.' });
  }
});

module.exports = router;
