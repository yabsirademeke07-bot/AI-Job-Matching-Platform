const db = require('../config/db');

const statements = [
  "ALTER TABLE job_seeker_profiles ADD COLUMN cv_url VARCHAR(255) DEFAULT NULL",
  "ALTER TABLE job_seeker_profiles ADD COLUMN cv_status ENUM('uploaded', 'skipped', 'none') NOT NULL DEFAULT 'none'",
  "ALTER TABLE job_seeker_profiles ADD COLUMN is_profile_complete BOOLEAN DEFAULT FALSE",
  "ALTER TABLE job_seeker_profiles ADD COLUMN onboarding_step_completed ENUM('cv_upload', 'manual_profile', 'completed') NOT NULL DEFAULT 'cv_upload'",
  "ALTER TABLE job_seeker_profiles ADD COLUMN cv_skipped BOOLEAN DEFAULT FALSE",
  "ALTER TABLE job_seeker_profiles ADD COLUMN onboarding_step VARCHAR(40) DEFAULT 'cv_upload'",
];

async function migrate() {
  for (const statement of statements) {
    try {
      await db.query(statement);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  await db.query(`
    UPDATE job_seeker_profiles
    SET cv_status = CASE
      WHEN cv_url IS NOT NULL AND cv_url <> '' THEN 'uploaded'
      WHEN cv_skipped = TRUE THEN 'skipped'
      ELSE 'none'
    END,
    is_profile_complete = COALESCE(profile_completed, FALSE),
    onboarding_step_completed = CASE
      WHEN COALESCE(profile_completed, FALSE) = TRUE THEN 'completed'
      WHEN cv_skipped = TRUE THEN 'manual_profile'
      ELSE 'cv_upload'
    END
  `);
}

migrate()
  .then(async () => {
    console.log('CV preference migration completed.');
    await db.end();
  })
  .catch(async (error) => {
    console.error('CV preference migration failed:', error.message);
    await db.end();
    process.exitCode = 1;
  });