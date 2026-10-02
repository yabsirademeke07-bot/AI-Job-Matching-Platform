const fs = require('fs/promises');
const path = require('path');
const db = require('../config/db');
const { extractText, classifyAndExtract, calculateScores, calculateJobMatches, validateCvContent, CV_CONTENT_ERROR } = require('../services/cvAnalysisService');

const INVALID_CV_MESSAGE = 'We could not identify enough CV content. Please upload a readable resume with your name or contact details and work history, projects, internships, or education.';
const SUCCESS_MESSAGE = 'Your CV was analyzed successfully.';

async function removeFile(file) {
  if (file?.path) await fs.unlink(file.path).catch(() => {});
}

async function getPublishedJobMatches(candidate) {
  const [jobs] = await db.execute(
    `SELECT j.id, j.title, j.company_name,
            COALESCE(cp.company_name, j.company_name, u.full_name, 'Company') AS employer_name,
            j.description, j.category, j.job_type, j.experience_level, j.location,
            j.work_mode, j.salary_min, j.salary_max, j.currency, j.required_skills,
            j.required_education, j.application_deadline, j.created_at
     FROM jobs j
     JOIN users u ON u.id = j.employer_id
     LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
     WHERE LOWER(j.status) IN ('published', 'active')
     ORDER BY j.created_at DESC`
  );
  if (!jobs.length) return [];

  const [requiredSkills] = await db.query(
    'SELECT job_id, skill_name FROM job_required_skills WHERE job_id IN (?) ORDER BY id',
    [jobs.map((job) => job.id)]
  );
  const skillsByJob = new Map();
  requiredSkills.forEach(({ job_id, skill_name }) => {
    const skills = skillsByJob.get(job_id) || [];
    skills.push(skill_name);
    skillsByJob.set(job_id, skills);
  });

  return calculateJobMatches(candidate, jobs.map((job) => ({
    ...job,
    company_name: job.employer_name,
    additional_required_skills: skillsByJob.get(job.id) || [],
  })));
}

async function uploadAndAnalyze(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Please select a PDF, DOCX, or image CV file.' });
  try {
    const parsedText = await extractText(req.file);
    if (!parsedText || !parsedText.trim()) {
      await removeFile(req.file);
      return res.status(422).json({ success: false, is_cv: false, message: 'We could not read any text from this document. Please upload a text-based PDF or DOCX, not a blank or image-only file.' });
    }

    const contentValidation = validateCvContent(parsedText);
    let extracted;
    if (contentValidation.valid || contentValidation.needsAiReview) {
      extracted = await classifyAndExtract(contentValidation.normalizedText);
    }
    if (!contentValidation.valid && !contentValidation.needsAiReview) {
      await removeFile(req.file);
      return res.status(422).json({ success: false, is_cv: false, message: contentValidation.message || CV_CONTENT_ERROR, validation: contentValidation.sections });
    }
    // The content validator is authoritative. The fallback classifier has an
    // older, stricter heuristic and must not reject an already valid profile.
    if (contentValidation.valid && extracted && !extracted.is_cv) {
      extracted.is_cv = true;
    }

    const hasContact = Boolean(
      (extracted.fullName || extracted.full_name) &&
      (extracted.email || extracted.phone)
    );
    const hasLocation = Boolean(extracted.location || extracted.city || extracted.address);
    const hasSkills = Array.isArray(extracted.skills) && extracted.skills.length > 0;
    const hasExperience = Boolean(
      (Array.isArray(extracted.experience) && extracted.experience.length > 0) ||
      extracted.yearsOfExperience !== undefined ||
      extracted.experienceLevel
    );
    const hasEducation = Boolean(
      (Array.isArray(extracted.education) && extracted.education.length > 0) ||
      extracted.degree ||
      extracted.educationLevel
    );
    const hasQualification = hasExperience || hasEducation;
    const isValidCv = hasContact && (hasQualification || hasSkills);

    console.log('SERVER CV PARSER EVALUATION:', {
      hasContact,
      hasLocation,
      hasSkills,
      hasExperience,
      hasEducation,
      hasQualification,
      isValidCv,
    });

    if (!isValidCv) {
      await removeFile(req.file);
      return res.status(422).json({
        success: false,
        is_cv: false,
        message: 'The uploaded document must include your contact details (name and email or phone) and either work experience, education, or skills.',
        validation: contentValidation.sections,
      });
    }

    const scores = calculateScores(extracted, parsedText);
    const jobMatches = await getPublishedJobMatches(extracted);
    const bestMatch = jobMatches.find((job) => job.match_score !== null);
    scores.matchScore = bestMatch?.match_score ?? null;
    scores.bestMatchJob = bestMatch ? {
      id: bestMatch.id,
      title: bestMatch.title,
      company_name: bestMatch.company_name,
    } : null;
    const analyzedData = { ...extracted, ...scores, jobMatches };
    const fileUrl = `/uploads/cvs/${path.basename(req.file.filename)}`;
    const connection = await db.getConnection();
    let cvId;
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE cvs SET is_primary = FALSE WHERE user_id = ?', [req.user.id]);
      const [cvResult] = await connection.execute(
        `INSERT INTO cvs (user_id, file_name, file_url, file_size, mime_type, is_primary, is_active, parsed_text, ai_analysis_score, ai_extracted_data)
         VALUES (?, ?, ?, ?, ?, TRUE, TRUE, ?, ?, ?)`,
        [req.user.id, req.file.originalname, fileUrl, req.file.size, req.file.mimetype, parsedText, scores.cvScore, JSON.stringify(analyzedData)]
      );
      cvId = cvResult.insertId;
      await connection.execute(
          `INSERT INTO cv_analysis (cv_id, extracted_skills, extracted_experience, extracted_education, extracted_languages, extracted_certifications, cv_score, readability_score, keyword_match_score, recommendations, analysis_status, analyzed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [cvId, JSON.stringify(extracted.skills), JSON.stringify(extracted.experience), JSON.stringify(extracted.education), JSON.stringify(extracted.languages), JSON.stringify(extracted.certifications), scores.cvScore, scores.readability, scores.keywordMatch, JSON.stringify(extracted.recommendations)]
      );
      await syncExtractedProfile(connection, req.user.id, extracted, parsedText, fileUrl);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.status(201).json({ success: true, is_cv: true, reviewRequired: true, message: SUCCESS_MESSAGE, data: { id: cvId, file_name: req.file.originalname, file_url: fileUrl, ...analyzedData } });
  } catch (error) {
    await removeFile(req.file);
    const databaseUnavailable = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code);
    const status = error.statusCode || (databaseUnavailable ? 503 : 500);
    const message = databaseUnavailable
      ? 'The database is unavailable. Start the configured MySQL server and try again.'
      : status === 500 ? 'Unable to analyze your CV.' : error.message;
    console.error('CV upload and analysis failed:', error.code || status, error.message);
    return res.status(status).json({ success: false, message });
  }
}

async function getCurrentCv(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT c.id, c.file_name, c.file_url, c.file_size, c.mime_type, c.upload_date,
              c.ai_extracted_data, a.cv_score, a.readability_score, a.keyword_match_score,
              a.extracted_skills, a.extracted_experience, a.extracted_education,
              a.extracted_languages, a.extracted_certifications, a.recommendations
       FROM cvs c
       LEFT JOIN cv_analysis a ON a.cv_id = c.id
       WHERE c.user_id = ?
       ORDER BY c.is_primary DESC, c.upload_date DESC
       LIMIT 1`,
      [req.user.id]
    );
    if (!rows[0]) return res.json({ success: true, cv: null });
    const row = rows[0];
    const extracted = parseJson(row.ai_extracted_data, {});
    return res.json({
      success: true,
      cv: {
        ...row,
        fileName: row.file_name,
        fileUrl: row.file_url,
        fileSize: row.file_size,
        cvScore: row.cv_score,
        readability: row.readability_score,
        keywordMatch: row.keyword_match_score,
        ...extracted,
        skills: parseJson(row.extracted_skills, extracted.skills || []),
        experience: parseJson(row.extracted_experience, extracted.experience || []),
        education: parseJson(row.extracted_education, extracted.education || []),
        languages: parseJson(row.extracted_languages, extracted.languages || []),
        certifications: parseJson(row.extracted_certifications, extracted.certifications || []),
        recommendations: parseJson(row.recommendations, extracted.recommendations || []),
      },
    });
  } catch (error) {
    console.error('Get current CV failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load your CV.' });
  }
}

async function validateAndParse(req, res) {
  if (!req.file) return res.status(422).json({ isCv: false, error: 'Please upload a readable candidate CV or resume.' });
  try {
    let parsedText;
    try {
      parsedText = await extractText(req.file);
    } catch (error) {
      return res.status(422).json({ isCv: false, error: 'We could not read this document. Please upload a readable PDF or DOCX CV.' });
    }
    const validation = validateCvContent(parsedText);
    if (!validation.valid && !validation.needsAiReview) return res.status(422).json({ isCv: false, error: validation.message || CV_CONTENT_ERROR, validation: validation.sections });

    const extracted = await classifyAndExtract(validation.normalizedText);
    const education = extracted.education?.[0] || {};
    const experience = extracted.experience?.[0] || {};
    const fullName = extracted.fullName || extracted.full_name || '';
    return res.status(200).json({
      isCv: true,
      firstName: extracted.firstName || fullName.split(/\s+/)[0] || '',
      lastName: extracted.lastName || fullName.split(/\s+/).slice(1).join(' ') || '',
      fullName,
      email: extracted.email || '',
      phone: extracted.phone || '',
      location: extracted.location || '',
      headline: extracted.headline || extracted.professional_title || '',
      education: [education.degree, education.school_name || education.institution].filter(Boolean).join(' - '),
      graduationYear: education.graduationYear || '',
      experienceRole: experience.job_title || experience.role || '',
      experienceDetail: experience.description || (experience.responsibilities || []).join('\n') || '',
      skills: (extracted.skills || []).map((skill) => typeof skill === 'string' ? skill : skill.skill_name).filter(Boolean),
      languages: (extracted.languages || []).map((language) => typeof language === 'string' ? language : language.language_name).filter(Boolean),
      jobPreference: typeof (extracted.jobPreference || extracted.job_preferences) === 'string'
        ? (extracted.jobPreference || extracted.job_preferences)
        : extracted.jobPreferences?.workMode || extracted.jobPreferences?.employmentType || '',
    });
  } catch (error) {
    return res.status(422).json({ isCv: false, error: CV_CONTENT_ERROR });
  } finally {
    await removeFile(req.file);
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
    const analysis = {
      ...row,
      parsed_text: undefined,
      ...extracted,
      cvScore: row.cv_score,
      readability: row.readability_score,
      keywordMatch: row.keyword_match_score,
      skills: parseJson(row.extracted_skills, extracted.skills || []),
      experience: parseJson(row.extracted_experience, extracted.experience || []),
      education: parseJson(row.extracted_education, extracted.education || []),
      languages: parseJson(row.extracted_languages, extracted.languages || []),
      certifications: parseJson(row.extracted_certifications, extracted.certifications || []),
      recommendations: parseJson(row.recommendations, extracted.recommendations || []),
    };
    analysis.jobMatches = await getPublishedJobMatches(analysis);
    const bestMatch = analysis.jobMatches.find((job) => job.match_score !== null);
    analysis.matchScore = bestMatch?.match_score ?? null;
    analysis.bestMatchJob = bestMatch ? {
      id: bestMatch.id,
      title: bestMatch.title,
      company_name: bestMatch.company_name,
    } : null;
    return res.json({ success: true, is_cv: true, data: analysis });
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
    const data = req.body && (req.body.skills || req.body.experience || req.body.education || req.body.languages || req.body.fullName || req.body.firstName || req.body.lastName)
      ? { ...req.body, fullName: req.body.fullName || [req.body.firstName, req.body.lastName].filter(Boolean).join(' '), firstName: req.body.firstName || '', lastName: req.body.lastName || '', professional_title: req.body.headline || req.body.professional_title, full_name: req.body.fullName || [req.body.firstName, req.body.lastName].filter(Boolean).join(' ') || req.body.full_name }
      : {
        ...parseJson(rows[0].ai_extracted_data, {}),
        skills: parseJson(rows[0].extracted_skills),
        experience: parseJson(rows[0].extracted_experience),
        education: parseJson(rows[0].extracted_education),
        languages: parseJson(rows[0].extracted_languages),
      };
    await connection.beginTransaction();
      await connection.execute(
        `UPDATE cvs SET ai_extracted_data = ?, ai_analysis_score = ? WHERE id = ? AND user_id = ?`,
        [JSON.stringify(data), data.cvScore || 0, req.params.id, req.user.id]
      );
      const fullName = data.fullName || data.full_name || [data.firstName, data.lastName].filter(Boolean).join(' ') || null;
      await connection.execute(
        'UPDATE users SET full_name = COALESCE(NULLIF(?, \'\'), full_name), email = COALESCE(NULLIF(?, \'\'), email), phone = COALESCE(NULLIF(?, \'\'), phone) WHERE id = ?',
        [fullName, data.email || '', data.phone || '', req.user.id]
      );
      await connection.execute(
        `UPDATE cv_analysis SET extracted_skills = ?, extracted_experience = ?, extracted_education = ?, extracted_languages = ?, extracted_certifications = ?, cv_score = ?, readability_score = ?, keyword_match_score = ?, recommendations = ?, analysis_status = 'completed', analyzed_at = NOW() WHERE cv_id = ?`,
        [JSON.stringify(data.skills || []), JSON.stringify(data.experience || []), JSON.stringify(data.education || []), JSON.stringify(data.languages || []), JSON.stringify(data.certifications || []), data.cvScore || 0, data.readability || 0, data.matchScore || data.keywordMatch || 0, JSON.stringify(data.recommendations || []), req.params.id]
      );
    await connection.execute(
      'INSERT INTO job_seeker_profiles (user_id, headline, profile_completion_percentage) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE headline = VALUES(headline), profile_completion_percentage = VALUES(profile_completion_percentage)',
      [req.user.id, data.professional_title || null, data.profileCompletion || 0]
    );
    const [profileRows] = await connection.execute(
      'SELECT id FROM job_seeker_profiles WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    if (!profileRows[0]) throw new Error('Unable to create seeker profile.');

    await connection.execute('UPDATE job_seeker_profiles SET education = ?, skills = ?, languages = ?, parsed_json_payload = ?, updated_at = NOW() WHERE user_id = ?', [JSON.stringify(data.education || []), JSON.stringify(data.skills || []), JSON.stringify(data.languages || []), JSON.stringify(data), req.user.id]);
    await connection.commit();
    return res.json({ success: true, message: 'Your profile was updated from the analyzed CV.', profile_completion_percentage: data.profileCompletion || 0 });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: 'Unable to sync CV data to your profile.' });
  } finally { connection.release(); }
}

module.exports = { uploadAndAnalyze, validateAndParse, getAnalysis, syncProfile, getCurrentCv };
