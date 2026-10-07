const db = require('../config/db');

const migrate = async () => {
  try {
    const [columns] = await db.query("SHOW COLUMNS FROM cvs LIKE 'mime_type'");
    if (!columns.length) throw new Error('cvs.mime_type column does not exist.');

    const currentLength = Number(columns[0].Type.match(/varchar\((\d+)\)/i)?.[1] || 0);
    if (currentLength < 100) {
      await db.query('ALTER TABLE cvs MODIFY COLUMN mime_type VARCHAR(100) NULL');
      console.log('CV MIME TYPE MIGRATION APPLIED');
    } else {
      console.log('CV MIME TYPE COLUMN ALREADY LARGE ENOUGH');
    }
  } finally {
    await db.end();
  }
};

migrate().catch((error) => {
  console.error('CV MIME TYPE MIGRATION FAILED:', error.code, error.message);
  process.exitCode = 1;
});