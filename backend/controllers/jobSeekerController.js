const seekerModel = require('../models/jobSeekerModel');
const db = require('../config/db');

const collections = {
  skills: { table: 'seeker_skills', fields: ['skill_name', 'skill_category', 'proficiency_level', 'years_of_experience'] },
  education: { table: 'seeker_education', fields: ['school_name', 'degree', 'field_of_study', 'start_date', 'end_date', 'is_current', 'description'] },
  experience: { table: 'seeker_experience', fields: ['company_name', 'job_title', 'employment_type', 'location', 'start_date', 'end_date', 'is_current', 'description', 'years_of_experience'] },
  languages: { table: 'seeker_languages', fields: ['language_name', 'proficiency'] }
};

async function getProfile(req, res) {
  try { return res.json({ success: true, ...(await seekerModel.getProfile(req.user.id)) }); }
  catch (error) { return res.status(500).json({ success: false, message: 'Unable to load job seeker profile.' }); }
}

async function updateProfile(req, res) {
  try { return res.json({ success: true, profile: await seekerModel.upsertProfile(req.user.id, req.body) }); }
  catch (error) { return res.status(500).json({ success: false, message: 'Unable to update job seeker profile.' }); }
}

async function saveProfile(req, res) {
  const connection = await db.getConnection();
  const personal = req.body?.personal_info || {};
  const skills = Array.isArray(req.body?.skills) ? req.body.skills : [];
  const education = Array.isArray(req.body?.education) ? req.body.education : [];
  const experience = Array.isArray(req.body?.experience) ? req.body.experience : [];
  try {
    await connection.beginTransaction();
    const fullName = String(personal.full_name || personal.fullName || '').trim();
    const email = String(personal.email || '').trim();
    const phone = String(personal.phone || '').trim() || null;
    if (fullName || email || phone) {
      await connection.execute(
        'UPDATE users SET full_name = COALESCE(NULLIF(?, \'\'), full_name), email = COALESCE(NULLIF(?, \'\'), email), phone = ?, onboarding_completed = TRUE WHERE id = ?',
        [fullName, email, phone, req.user.id]
      );
    } else {
      await connection.execute('UPDATE users SET onboarding_completed = TRUE WHERE id = ?', [req.user.id]);
    }
    const location = String(personal.location || '').trim() || null;
    const city = String(personal.city || '').trim() || null;
    const country = String(personal.country || '').trim() || null;
    await connection.execute(
      `INSERT INTO job_seeker_profiles (user_id, headline, bio, location, city, country, profile_completion_percentage, is_available)
       VALUES (?, ?, ?, ?, ?, ?, 85, TRUE)
       ON DUPLICATE KEY UPDATE headline = VALUES(headline), bio = VALUES(bio), location = VALUES(location), city = VALUES(city), country = VALUES(country), profile_completion_percentage = 85, is_available = TRUE, updated_at = NOW()`,
      [req.user.id, personal.headline || null, personal.bio || null, location, city, country]
    );
    await connection.execute('DELETE FROM seeker_skills WHERE user_id = ?', [req.user.id]);
    await connection.execute('DELETE FROM seeker_education WHERE user_id = ?', [req.user.id]);
    await connection.execute('DELETE FROM seeker_experience WHERE user_id = ?', [req.user.id]);

    for (const skill of skills) {
      const name = String(typeof skill === 'string' ? skill : skill.skill_name || skill.name || '').trim().toLowerCase();
      if (!name) continue;
      await connection.execute(
        `INSERT INTO seeker_skills (user_id, skill_name, skill_category, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE skill_category = VALUES(skill_category), proficiency_level = VALUES(proficiency_level), years_of_experience = VALUES(years_of_experience)`,
        [req.user.id, name, typeof skill === 'object' ? skill.skill_category || 'technical' : 'technical', typeof skill === 'object' ? skill.proficiency_level || 'intermediate' : 'intermediate', typeof skill === 'object' ? skill.years_of_experience || null : null]
      );
    }
    for (const item of education) {
      const school = String(item.school_name || item.university || item.institution || '').trim();
      const degree = String(item.degree || '').trim();
      const field = String(item.field_of_study || item.department || '').trim();
      if (!school || !degree || !field) continue;
      await connection.execute(
        'INSERT INTO seeker_education (user_id, school_name, degree, field_of_study, start_date, end_date, is_current, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, school, degree, field, item.start_date || null, item.end_date || (item.graduationYear ? `${item.graduationYear}-01-01` : null), Boolean(item.is_current), item.description || null]
      );
    }
    for (const item of experience) {
      const company = String(item.company_name || item.company || '').trim();
      const role = String(item.job_title || item.role || item.position || '').trim();
      if (!company || !role) continue;
      await connection.execute(
        'INSERT INTO seeker_experience (user_id, company_name, job_title, employment_type, location, start_date, end_date, is_current, description, years_of_experience) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, company, role, item.employment_type || 'contract', item.location || null, item.start_date || null, item.end_date || null, Boolean(item.is_current), Array.isArray(item.responsibilities) ? item.responsibilities.join('\n') : item.description || null, item.years_of_experience || null]
      );
    }
    await connection.commit();
    return res.json({ success: true, message: 'Profile saved successfully.', onboarding_completed: true });
  } catch (error) {
    await connection.rollback();
    console.error('Unified profile save failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save your profile.' });
  } finally {
    connection.release();
  }
}

async function uploadCv(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please select a CV file.' });

  try {
    const fileUrl = `/uploads/cvs/${req.file.filename}`;
    const [result] = await db.execute(
      `INSERT INTO cvs (user_id, file_name, file_url, file_size, mime_type, is_primary, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE, TRUE)`,
      [req.user.id, req.file.originalname, fileUrl, req.file.size, req.file.mimetype]
    );

    return res.status(201).json({
      success: true,
      cv: { id: result.insertId, fileName: req.file.originalname, fileUrl, fileSize: req.file.size },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to save your CV.' });
  }
}

async function listCollection(req, res) {
  const collection = collections[req.params.collection];
  if (!collection) return res.status(404).json({ success: false, message: 'Unknown profile collection.' });
  try { return res.json({ success: true, [req.params.collection]: await seekerModel.listByUser(collection.table, req.user.id) }); }
  catch (error) { return res.status(500).json({ success: false, message: 'Unable to load profile data.' }); }
}

async function addCollectionItem(req, res) {
  const collection = collections[req.params.collection];
  if (!collection) return res.status(404).json({ success: false, message: 'Unknown profile collection.' });
  const values = collection.fields.map((field) => req.body[field] ?? null);
  if (values.every((value) => value === null)) return res.status(400).json({ success: false, message: 'Profile data is required.' });
  try {
    const id = await seekerModel.addItem(collection.table, ['user_id', ...collection.fields], [req.user.id, ...values]);
    return res.status(201).json({ success: true, id });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to save profile data.' }); }
}

async function deleteCollectionItem(req, res) {
  const collection = collections[req.params.collection];
  if (!collection) return res.status(404).json({ success: false, message: 'Unknown profile collection.' });
  try {
    const deleted = await seekerModel.deleteItem(collection.table, req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Profile item not found.' });
    return res.status(204).send();
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to delete profile data.' }); }
}

async function getApplications(req, res) {
  try { return res.json({ success: true, applications: await seekerModel.getApplications(req.user.id) }); }
  catch (error) { return res.status(500).json({ success: false, message: 'Unable to load applications.' }); }
}

module.exports = { getProfile, updateProfile, saveProfile, uploadCv, listCollection, addCollectionItem, deleteCollectionItem, getApplications };
