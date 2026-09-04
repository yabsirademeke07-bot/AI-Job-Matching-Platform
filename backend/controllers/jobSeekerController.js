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

module.exports = { getProfile, updateProfile, uploadCv, listCollection, addCollectionItem, deleteCollectionItem, getApplications };
