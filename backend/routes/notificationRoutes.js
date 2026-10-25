const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');

const router = express.Router();

router.use(authMiddleware);

router.patch('/mark-all-read', async (req, res) => {
  try {
    const [result] = await db.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [req.user.id || req.user.userId],
    );
    return res.json({ success: true, data: { count: 0, updatedCount: Number(result.affectedRows || 0) } });
  } catch (error) {
    console.error('Mark all notifications as read failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to mark notifications as read.' });
  }
});

router.post('/disconnect', async (req, res) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE users
       SET telegram_chat_id = NULL, telegram_username = NULL,
           is_alerts_enabled = FALSE, is_telegram_alerts_active = FALSE
       WHERE id = ?`,
      [req.user.id],
    );
    await connection.execute(
      `INSERT INTO notification_preferences (user_id, telegram_alerts_enabled)
       VALUES (?, FALSE)
       ON DUPLICATE KEY UPDATE telegram_alerts_enabled = FALSE`,
      [req.user.id],
    );
    await connection.execute('DELETE FROM telegram_link_verifications WHERE user_id = ?', [req.user.id]);
    await connection.execute('DELETE FROM telegram_bot_link_tokens WHERE user_id = ?', [req.user.id]);
    await connection.commit();
    return res.json({ success: true, message: 'Telegram disconnected. No more Telegram alerts will be sent.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Telegram disconnect failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to disconnect Telegram.' });
  } finally {
    connection?.release();
  }
});

module.exports = router;
