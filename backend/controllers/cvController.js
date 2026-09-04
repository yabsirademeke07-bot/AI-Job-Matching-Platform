const fs = require('fs/promises');
const path = require('path');
const db = require('../config/db');
const { extractText, classifyAndExtract, calculateScores, calculateRealJobMatch } = require('../services/cvAnalysisService');

const INVALID_CV_MESSAGE = 'Invalid file: Does not contain Resume/CV content.';
const SUCCESS_MESSAGE = 'Your CV was analyzed successfully.';

async function removeFile(file) {
  if (file?.path) await fs.unlink(file.path).catch(() => {});
}

async function uploadAndAnalyze(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please select a PDF or DOCX CV file.' });
  try {
    const parsedText = await extractText(req.file);
    if (!parsedText || !parsedText.trim()) {
      await removeFile(req.file);
      return res.status(422).json({ success: false, is_cv: false, message: INVALID_CV_MESSAGE });
    }

    const extracted = await classifyAndExtract(parsedText);
    if (!extracted.is_cv) {
      await removeFile(req.file);
      return res.status(422).json({ success: false, is_cv: false, message: INVALID_CV_MESSAGE });
    }

    const [activeJobs] = await db.execute(
      `SELECT j.id, GROUP_CONCAT(jrs.skill_name) AS required_skills
       FROM jobs j
       JOIN job_required_skills jrs ON jrs.job_id = j.id
       WHERE j.status = 'published'
       GROUP BY j.id`
    );
    const scores = calculateScores(extracted, parsedText);
    const matchScore = calculateRealJobMatch(extracted.skills, activeJobs.map((job) => ({
      ...job,
      required_skills: job.required_skills ? job.required_skills.split(',') : [],
    })));
    scores.matchScore = matchScore;
    scores.keywordMatch = matchScore;
    const fileUrl = `/uploads/cvs/${path.basename(req.file.filename)}`;
    const connection = await db.getConnection();
    let cvId;
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE cvs SET is_primary = FALSE WHERE user_id = ?', [req.user.id]);
      const [cvResult] = await connection.execute(
        `INSERT INTO cvs (user_id, file_name, file_url, file_size, mime_type, is_primary, is_active, parsed_text, ai_analysis_score, ai_extracted_data)
         VALUES (?, ?, ?, ?, ?, TRUE, TRUE, ?, ?, ?)`,
        [req.user.id, req.file.originalname, fileUrl, req.file.size, req.file.mimetype, parsedText, scores.cvScore, JSON.stringify({ ...extracted, ...scores })]
      );
      cvId = cvResult.insertId;
      await connection.execute(
        `INSERT INTO cv_analysis (cv_id, extracted_skills, extracted_experience, extracted_education, extracted_languages, extracted_certifications, cv_score, readability_score, keyword_match_score, recommendations, analysis_status, analyzed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [cvId, JSON.stringify(extracted.skills), JSON.stringify(extracted.experience), JSON.stringify(extracted.education), JSON.stringify(extracted.languages), JSON.stringify(extracted.certifications), scores.cvScore, scores.readability, scores.keywordMatch, JSON.stringify(extracted.recommendations)]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.status(201).json({ success: true, is_cv: true, message: SUCCESS_MESSAGE, data: { id: cvId, file_name: req.file.originalname, file_url: fileUrl, ...extracted, ...scores } });
  } catch (error) {
    await removeFile(req.file);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, message: status === 500 ? 'Unable to analyze your CV.' : error.message });
  }
}

function parseJson(value, fallback = []) {
  if (Array.isArray(value)) return value;
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

async function getAnalysis(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT c.id, c.file_name, c.file_url, c.file_size, c.mime_type, c.parsed_text, c.ai_extracted_data,
              a.extracted_skills, a.extracted_experience, a.extracted_education, a.extracted_languages, a.extracted_certifications,
              a.cv_score, a.readability_score, a.keyword_match_score, a.recommendations, a.analysis_status, a.analyzed_at
       FROM cvs c LEFT JOIN cv_analysis a ON a.cv_id = c.id WHERE c.id = ? AND c.user_id = ? LIMIT 1`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'CV analysis not found.' });
    const row = rows[0];
    const extracted = parseJson(row.ai_extracted_data, {});
    return res.json({ success: true, is_cv: true, data: { ...row, parsed_text: undefined, ...extracted, cvScore: row.cv_score, readability: row.readability_score, keywordMatch: row.keyword_match_score, skills: parseJson(row.extracted_skills, extracted.skills || []), experience: parseJson(row.extracted_experience, extracted.experience || []), education: parseJson(row.extracted_education, extracted.education || []), languages: parseJson(row.extracted_languages, extracted.languages || []), certifications: parseJson(row.extracted_certifications, extracted.certifications || []), recommendations: parseJson(row.recommendations, extracted.recommendations || []) } });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to load CV analysis.' }); }
}

async function syncProfile(req, res) {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.execute(
      `SELECT c.ai_extracted_data, a.extracted_skills, a.extracted_experience, a.extracted_education, a.extracted_languages
       FROM cvs c LEFT JOIN cv_analysis a ON a.cv_id = c.id WHERE c.id = ? AND c.user_id = ? LIMIT 1`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'CV analysis not found.' });
    const data = req.body && (req.body.skills || req.body.experience || req.body.education || req.body.languages)
      ? req.body
      : {
        ...parseJson(rows[0].ai_extracted_data, {}),
        skills: parseJson(rows[0].extracted_skills),
        experience: parseJson(rows[0].extracted_experience),
        education: parseJson(rows[0].extracted_education),
        languages: parseJson(rows[0].extracted_languages),
      };
    await connection.beginTransaction();
    await connection.execute(
      'INSERT INTO job_seeker_profiles (user_id, headline, profile_completion_percentage) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE headline = VALUES(headline), profile_completion_percentage = VALUES(profile_completion_percentage)',
      [req.user.id, data.professional_title || null, data.profileCompletion || 0]
    );
    const [profileRows] = await connection.execute(
      'SELECT id FROM job_seeker_profiles WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    if (!profileRows[0]) throw new Error('Unable to create seeker profile.');

    await connection.execute('DELETE FROM seeker_experience WHERE user_id = ?', [req.user.id]);
    await connection.execute('DELETE FROM seeker_education WHERE user_id = ?', [req.user.id]);
    await connection.execute('DELETE FROM seeker_languages WHERE user_id = ?', [req.user.id]);
    for (const skill of data.skills || []) {
      if (!skill.skill_name) continue;
      await connection.execute(`INSERT INTO seeker_skills (user_id, skill_name, skill_category, proficiency_level, years_of_experience) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE skill_category = VALUES(skill_category), proficiency_level = VALUES(proficiency_level), years_of_experience = VALUES(years_of_experience)`, [req.user.id, skill.skill_name, skill.skill_category || null, skill.proficiency_level || 'intermediate', skill.years_of_experience || null]);
    }
    for (const item of data.experience || []) {
      if (!item.company_name || !item.job_title) continue;
      await connection.execute(`INSERT INTO seeker_experience (user_id, company_name, job_title, employment_type, location, start_date, end_date, is_current, description, years_of_experience) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.user.id, item.company_name, item.job_title, item.employment_type || 'contract', item.location || null, item.start_date || null, item.end_date || null, Boolean(item.is_current), item.description || null, item.years_of_experience || null]);
    }
    for (const item of data.education || []) {
      const schoolName = item.school_name || 'Not specified';
      const degree = item.degree || 'Not specified';
      const fieldOfStudy = item.field_of_study || 'Not specified';
      await connection.execute(`INSERT INTO seeker_education (user_id, school_name, degree, field_of_study, start_date, end_date, is_current, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [req.user.id, schoolName, degree, fieldOfStudy, item.start_date || null, item.end_date || null, Boolean(item.is_current), item.description || null]);
    }
    for (const language of data.languages || []) {
      if (!language.language_name) continue;
      const allowedProficiencies = ['elementary', 'limited-working', 'professional-working', 'full-professional', 'native'];
      const proficiency = allowedProficiencies.includes(language.proficiency) ? language.proficiency : 'professional-working';
      await connection.execute(
        'INSERT INTO seeker_languages (user_id, language_name, proficiency) VALUES (?, ?, ?)',
        [req.user.id, language.language_name, proficiency]
      );
    }
    await connection.commit();
    return res.json({ success: true, message: 'Your profile was updated from the analyzed CV.', profile_completion_percentage: data.profileCompletion || 0 });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Unable to sync CV data to your profile.' });
  } finally { connection.release(); }
}

module.exports = { uploadAndAnalyze, getAnalysis, syncProfile };
