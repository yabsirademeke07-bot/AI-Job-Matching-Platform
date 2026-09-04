const db = require('../config/db');

async function getProfile(userId) {
  const [profiles] = await db.execute('SELECT * FROM job_seeker_profiles WHERE user_id = ? LIMIT 1', [userId]);
  const [skills] = await db.execute('SELECT * FROM seeker_skills WHERE user_id = ? ORDER BY skill_name', [userId]);
  const [education] = await db.execute('SELECT * FROM seeker_education WHERE user_id = ? ORDER BY start_date DESC', [userId]);
  const [experience] = await db.execute('SELECT * FROM seeker_experience WHERE user_id = ? ORDER BY start_date DESC', [userId]);
  const [languages] = await db.execute('SELECT * FROM seeker_languages WHERE user_id = ? ORDER BY language_name', [userId]);
  return { profile: profiles[0] || null, skills, education, experience, languages };
}

async function upsertProfile(userId, profile) {
  const fields = [
    'headline', 'bio', 'location', 'country', 'city', 'state_province',
    'latitude', 'longitude', 'preferred_job_type', 'preferred_work_mode',
    'salary_expectation_min', 'salary_expectation_max', 'currency',
    'is_available', 'is_open_to_opportunities'
  ];
  const values = fields.map((field) => profile[field] ?? null);
  await db.execute(
    `INSERT INTO job_seeker_profiles (user_id, ${fields.join(', ')})
     VALUES (?, ${fields.map(() => '?').join(', ')})
     ON DUPLICATE KEY UPDATE ${fields.map((field) => `${field} = VALUES(${field})`).join(', ')}`,
    [userId, ...values]
  );
  const [rows] = await db.execute('SELECT * FROM job_seeker_profiles WHERE user_id = ? LIMIT 1', [userId]);
  return rows[0];
}

async function listByUser(table, userId) {
  const [rows] = await db.execute(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY id DESC`, [userId]);
  return rows;
}

async function addItem(table, columns, values) {
  const [result] = await db.execute(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    values
  );
  return result.insertId;
}

async function deleteItem(table, id, userId) {
  const [result] = await db.execute(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
  return result.affectedRows > 0;
}

async function getApplications(userId) {
  const [rows] = await db.execute(
    `SELECT a.id, a.job_id, a.status, a.ai_match_score, a.applied_at, j.title, j.location, j.work_mode
     FROM applications a JOIN jobs j ON j.id = a.job_id
     WHERE a.job_seeker_id = ? ORDER BY a.applied_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = { getProfile, upsertProfile, listByUser, addItem, deleteItem, getApplications };
