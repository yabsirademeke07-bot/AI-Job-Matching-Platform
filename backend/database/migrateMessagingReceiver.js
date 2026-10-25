const db = require('../config/db');

async function migrateMessagingReceiver() {
  const [columns] = await db.execute(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'messages'
       AND COLUMN_NAME = 'receiver_id'
     LIMIT 1`,
  );

  if (!columns.length) {
    await db.execute(
      'ALTER TABLE messages ADD COLUMN receiver_id INT NULL DEFAULT NULL AFTER sender_id',
    );
    console.log('Added messages.receiver_id.');
  } else {
    console.log('messages.receiver_id already exists.');
  }

  const [indexes] = await db.execute(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'messages'
       AND INDEX_NAME = 'idx_receiver_id'
     LIMIT 1`,
  );

  if (!indexes.length) {
    await db.execute('CREATE INDEX idx_receiver_id ON messages (receiver_id)');
    console.log('Added messages.idx_receiver_id.');
  } else {
    console.log('messages.idx_receiver_id already exists.');
  }
}

migrateMessagingReceiver()
  .catch((error) => {
    console.error('Messaging receiver migration failed:', error.code, error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
