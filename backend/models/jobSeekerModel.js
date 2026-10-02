const db = require('../config/db');

const textValue = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return '';
  return String(value).trim();
};

async function getProfile(userId) {
  const [users] = await db.execute('SELECT id, full_name, email, phone FROM users WHERE id = ? LIMIT 1', [userId]);
  const [profiles] = await db.execute('SELECT jsp.* FROM job_seeker_profiles jsp WHERE jsp.user_id = ? LIMIT 1', [userId]);
  const user = users[0] || {};
  const profile = profiles[0] || { user_id: userId };
  let experience = [];
  let education = [];
  let skills = [];
  let languages = [];
  try {
    const payload = profile?.parsed_json_payload ? JSON.parse(profile.parsed_json_payload) : {};
    experience = Array.isArray(payload.experience) ? payload.experience : [];
  } catch { experience = []; }
  try { education = profile?.education ? JSON.parse(profile.education) : []; } catch { education = []; }
  try {
    const savedSkills = profile?.skills ? JSON.parse(profile.skills) : [];
    skills = (Array.isArray(savedSkills) ? savedSkills : []).map((skill) => typeof skill === 'string' ? { skill_name: skill } : skill);
  } catch { skills = []; }
  try {
    const savedLanguages = profile?.languages ? JSON.parse(profile.languages) : [];
    languages = (Array.isArray(savedLanguages) ? savedLanguages : []).map((language) => typeof language === 'string' ? { language_name: language } : language);
  } catch { languages = []; }
  return {
    profile: { ...profile, full_name: user.full_name || '', email: user.email || '', phone: user.phone || '' },
    skills,
    education,
    experience,
    languages,
  };
}

async function upsertProfile(userId, profile) {
  const connection = await db.getConnection();
  const workMode = {
    'on-site': 'on-site', onsite: 'on-site',
    remote: 'remote', hybrid: 'hybrid', any: 'any', 'any / flexible': 'any',
  }[String(profile.workSetup || '').trim().toLowerCase()] || 'any';
  const jobType = {
    'full-time': 'full-time', 'part-time': 'part-time', freelance: 'freelance',
    contractual: 'contractual', volunteer: 'volunteer', 'intern (paid)': 'intern (paid)',
    'intern (unpaid)': 'intern (unpaid)', contract: 'contractual', internship: 'intern (paid)',
  }[String(profile.jobType || '').trim().toLowerCase()] || 'full-time';
  try {
    await connection.beginTransaction();
    const [userRows] = await connection.execute('SELECT email FROM users WHERE id = ? LIMIT 1', [userId]);
    await connection.execute(
      `INSERT INTO job_seeker_profiles
         (user_id, headline, location, city, education, graduation_year,
         skills, languages, job_preferences, job_type,
         expected_salary, work_setup, raw_cv_text, parsed_json_payload,
         job_category, experience_level, education_level, bio, preferred_job_type, preferred_work_mode,
        salary_expectation_min, salary_expectation_max, currency, profile_completed, is_profile_complete, profile_completion_percentage,
        cv_url, cv_status, cv_skipped, onboarding_step, onboarding_step_completed,
         is_available, is_open_to_opportunities)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE headline = VALUES(headline),
         location = VALUES(location), city = VALUES(city), education = VALUES(education),
         graduation_year = VALUES(graduation_year), skills = VALUES(skills), languages = VALUES(languages), job_preferences = VALUES(job_preferences),
         job_type = VALUES(job_type), expected_salary = VALUES(expected_salary),
         work_setup = VALUES(work_setup), raw_cv_text = VALUES(raw_cv_text), parsed_json_payload = VALUES(parsed_json_payload),
         job_category = VALUES(job_category), experience_level = VALUES(experience_level), education_level = VALUES(education_level),
         bio = VALUES(bio), preferred_job_type = VALUES(preferred_job_type), preferred_work_mode = VALUES(preferred_work_mode),
         salary_expectation_min = VALUES(salary_expectation_min), salary_expectation_max = VALUES(salary_expectation_max),
         profile_completed = VALUES(profile_completed), is_profile_complete = VALUES(is_profile_complete), profile_completion_percentage = VALUES(profile_completion_percentage),
         cv_url = COALESCE(NULLIF(VALUES(cv_url), ''), cv_url), cv_status = IF(VALUES(cv_status) = 'none', cv_status, VALUES(cv_status)), cv_skipped = VALUES(cv_skipped), onboarding_step = VALUES(onboarding_step), onboarding_step_completed = VALUES(onboarding_step_completed),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, profile.headline || profile.desiredPosition || null, profile.location || profile.city || null, profile.city || profile.location || null, JSON.stringify(profile.education || []), profile.graduationYear || null,
        JSON.stringify(profile.skills || []), JSON.stringify(profile.languages || []),
        JSON.stringify({ jobCategory: profile.jobCategory || null, experienceLevel: profile.experienceLevel || null }), profile.jobType || null,
        profile.expectedSalary || null, profile.workSetup || null, profile.rawCvText || '', JSON.stringify(profile),
        profile.jobCategory || profile.jobPreference || null, profile.experienceLevel || null, profile.educationLevel || null, profile.bio || null,
        jobType, workMode, profile.expectedSalary || null, profile.expectedSalaryMax || null, 'ETB', profile.completionPercentage === 100,
        profile.completionPercentage === 100, profile.completionPercentage, profile.cvUrl || null, profile.cvStatus || 'none', profile.cvStatus === 'skipped', profile.onboardingStep || 'personal_info', profile.onboardingStepCompleted || (profile.completionPercentage === 100 ? 'completed' : 'manual_profile'), true, true]
    );
    await connection.execute(
      'UPDATE users SET full_name = COALESCE(NULLIF(?, \'\'), full_name), email = COALESCE(NULLIF(?, \'\'), email), phone = COALESCE(NULLIF(?, \'\'), phone), onboarding_completed = TRUE WHERE id = ?',
      [profile.fullName || '', profile.email || '', profile.phone || '', userId]
    );
    await connection.commit();
    const [rows] = await connection.execute('SELECT * FROM job_seeker_profiles WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
    `SELECT a.id, a.job_id, a.status, a.ai_match_score, a.skills_match_score, a.experience_match_score,
            a.education_match_score, a.resume_snapshot, a.seeker_cover_letter, a.applied_at,
            j.title, j.location, j.work_mode, j.job_type, j.description,
            COALESCE(j.company_name, u.full_name, 'Employer company') AS company_name,
            c.file_name AS resume_file_name, c.file_url AS resume_file_url
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = j.employer_id
     LEFT JOIN cvs c ON c.id = a.cv_id
     WHERE a.job_seeker_id = ? ORDER BY a.applied_at DESC`,
    [userId]
  );
  return rows.map((application) => {
    let snapshot = {};
    try { snapshot = application.resume_snapshot ? JSON.parse(application.resume_snapshot) : {}; } catch { snapshot = {}; }
    return {
      ...application,
      jobId: application.job_id,
      jobTitle: application.title,
      company: application.company_name,
      appliedAt: application.applied_at,
      aiMatchScore: application.ai_match_score,
      matchScore: application.ai_match_score,
      skillsMatch: application.skills_match_score,
      experienceMatch: application.experience_match_score,
      educationMatch: application.education_match_score,
      locationMatch: application.location_match_score,
      matchBreakdown: {
        skills: application.skills_match_score,
        experience: application.experience_match_score,
        education: application.education_match_score,
        overall: application.ai_match_score,
      },
      submittedResume: {
        fileName: snapshot.fileName || application.resume_file_name,
        fileUrl: snapshot.fileUrl || application.resume_file_url,
      },
      submittedResumeName: snapshot.fileName || application.resume_file_name,
      submittedResumeUrl: snapshot.fileUrl || application.resume_file_url,
      coverLetter: application.seeker_cover_letter,
      job: { id: application.job_id, title: application.title, company: application.company_name, location: application.location, description: application.description, job_type: application.job_type, work_mode: application.work_mode },
    };
  });
}

module.exports = { getProfile, upsertProfile, listByUser, addItem, deleteItem, getApplications };
