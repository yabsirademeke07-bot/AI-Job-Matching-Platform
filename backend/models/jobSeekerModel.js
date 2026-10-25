const db = require('../config/db');
const { calculateMatchScore } = require('../services/matchScoreService');

const textValue = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return '';
  return String(value).trim();
};
const parseStoredJson = (value, fallback = []) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const storedList = (value) => {
  const parsed = parseStoredJson(value, []);
  if (Array.isArray(parsed)) return parsed;
  return parsed && typeof parsed === 'object' ? Object.values(parsed).flat() : [];
};

async function getProfile(userId) {
  const [users] = await db.execute('SELECT id, full_name, email, phone, is_verified, avatar_url, profile_picture_url, telegram_username FROM users WHERE id = ? LIMIT 1', [userId]);
  const [profiles] = await db.execute('SELECT jsp.* FROM job_seeker_profiles jsp WHERE jsp.user_id = ? LIMIT 1', [userId]);
  const user = users[0] || {};
  const profile = profiles[0] || { user_id: userId };
  let experience = [];
  let certifications = [];
  let education = [];
  let skills = [];
  let languages = [];
  let parsedPayload = {};
  try {
    parsedPayload = profile?.parsed_json_payload ? JSON.parse(profile.parsed_json_payload) : {};
    experience = Array.isArray(parsedPayload.experience) ? parsedPayload.experience : [];
    certifications = Array.isArray(parsedPayload.certifications) ? parsedPayload.certifications : [];
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
    profile: {
      ...profile,
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      is_verified: user.is_verified,
      avatar_url: user.avatar_url || user.profile_picture_url || null,
      profile_picture_url: user.profile_picture_url || user.avatar_url || null,
      telegram_username: user.telegram_username || '',
      country_code: profile.country_code || parsedPayload.country_code || null,
      phone_number: profile.phone_number || parsedPayload.phone_number || null,
    },
    skills,
    education,
    experience,
    languages,
    certifications,
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
    const columns = [
      'user_id', 'headline', 'location', 'city', 'education', 'graduation_year',
      'skills', 'languages', 'job_preferences', 'job_type',
      'expected_salary', 'work_setup', 'raw_cv_text', 'parsed_json_payload',
      'job_category', 'experience_level', 'education_level', 'bio', 'preferred_job_type', 'preferred_work_mode',
      'salary_expectation_min', 'salary_expectation_max', 'currency', 'profile_completed', 'is_profile_complete', 'profile_completion_percentage',
      'cv_url', 'cv_status', 'cv_skipped', 'onboarding_step', 'onboarding_step_completed',
      'is_available', 'is_open_to_opportunities'
    ];
    const values = [
      userId,
      profile.headline || profile.desiredPosition || null,
      profile.location || profile.city || null,
      profile.city || profile.location || null,
      JSON.stringify(profile.education || []),
      profile.graduationYear || null,
      JSON.stringify(profile.skills || []),
      JSON.stringify(profile.languages || []),
      JSON.stringify({ jobCategory: profile.jobCategory || null, experienceLevel: profile.experienceLevel || null }),
      profile.jobType || null,
      profile.expectedSalary || null,
      profile.workSetup || null,
      profile.rawCvText || '',
      JSON.stringify(profile),
      profile.jobCategory || profile.jobPreference || null,
      profile.experienceLevel || null,
      profile.educationLevel || null,
      profile.bio || null,
      jobType,
      workMode,
      profile.expectedSalary || null,
      profile.expectedSalaryMax || null,
      'ETB',
      profile.completionPercentage === 100,
      profile.completionPercentage === 100,
      profile.completionPercentage,
      profile.cvUrl || null,
      profile.cvStatus || 'none',
      profile.cvStatus === 'skipped',
      profile.onboardingStep || 'personal_info',
      profile.onboardingStepCompleted || (profile.completionPercentage === 100 ? 'completed' : 'manual_profile'),
      true,
      true,
    ];

    await connection.execute(
      `INSERT INTO job_seeker_profiles (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})
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
      values,
    );
    await connection.execute(
      'UPDATE users SET full_name = COALESCE(NULLIF(?, \'\'), full_name), email = COALESCE(NULLIF(?, \'\'), email), phone = COALESCE(NULLIF(?, \'\'), phone), onboarding_completed = TRUE, seeker_onboarded = (seeker_onboarded OR ?) WHERE id = ?',
      [profile.fullName || '', profile.email || '', profile.phone || '', profile.completionPercentage === 100, userId]
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

async function getApplications(userId, { q = '', status = 'all', sort = 'date_desc', applicationId = null } = {}) {
  const [[statusCounts]] = await db.execute(
    `SELECT COUNT(*) AS allCount,
            COALESCE(SUM(LOWER(REPLACE(REPLACE(status, '_', ' '), '-', ' ')) IN ('pending', 'applied', 'new', 'review', 'under review', 'in review')), 0) AS pendingCount,
            COALESCE(SUM(LOWER(status) = 'shortlisted'), 0) AS shortlistedCount,
            COALESCE(SUM(LOWER(REPLACE(REPLACE(status, '_', '-'), ' ', '-')) IN ('interview', 'interviewed', 'interview-scheduled')), 0) AS interviewCount,
            COALESCE(SUM(LOWER(status) IN ('hired', 'accepted', 'offer')), 0) AS hiredCount,
            COALESCE(SUM(LOWER(status) IN ('rejected', 'declined')), 0) AS rejectedCount,
            COALESCE(SUM(LOWER(status) = 'withdrawn'), 0) AS withdrawnCount
     FROM applications WHERE job_seeker_id = ?`,
    [userId]
  );
  const filters = ['a.job_seeker_id = ?'];
  const params = [userId];
  if (applicationId !== null) {
    filters.push('a.id = ?');
    params.push(applicationId);
  }
  const searchText = String(q || '').trim();
  if (searchText) {
    filters.push(`(j.title LIKE ? OR COALESCE(j.company_name, cp.company_name, ep.company_name, '') LIKE ?)`);
    const escapedSearch = searchText.replace(/[\\%_]/g, '\\$&');
    params.push(`%${escapedSearch}%`, `%${escapedSearch}%`);
  }
  const statusConditions = {
    pending: "LOWER(REPLACE(REPLACE(a.status, '_', ' '), '-', ' ')) IN ('pending', 'applied', 'new', 'review', 'under review', 'in review')",
    shortlisted: "LOWER(a.status) = 'shortlisted'",
    interview: "LOWER(REPLACE(REPLACE(a.status, '_', '-'), ' ', '-')) IN ('interview', 'interviewed', 'interview-scheduled')",
    hired: "LOWER(a.status) IN ('hired', 'accepted', 'offer')",
    rejected: "LOWER(a.status) IN ('rejected', 'declined')",
    withdrawn: "LOWER(a.status) = 'withdrawn'",
  };
  const normalizedStatus = String(status || 'all').toLowerCase().replace(/-/g, '_');
  if (normalizedStatus !== 'all' && statusConditions[normalizedStatus]) {
    filters.push(statusConditions[normalizedStatus]);
  }
  const orderBy = {
    date_desc: 'a.applied_at DESC, a.id DESC',
    match_desc: 'a.ai_match_score DESC, a.applied_at DESC',
    salary_desc: 'COALESCE(j.salary_max, j.salary_min, 0) DESC, a.applied_at DESC',
  }[sort] || 'a.applied_at DESC, a.id DESC';
  const [rows] = await db.execute(
    `SELECT a.id, a.job_seeker_id AS applicant_id, a.job_id, a.status, a.ai_match_score, a.skills_match_score, a.experience_match_score,
            a.education_match_score, a.resume_snapshot, a.seeker_cover_letter, a.applied_at, a.updated_at,
            a.employer_notes, a.evaluated_at,
            i.id AS interview_id, i.scheduled_at AS interview_scheduled_at,
            i.interview_status, i.interview_type, i.interview_url, i.candidate_response, i.notes AS interview_notes, i.duration_minutes,
            private_note.note_text AS private_note, private_note.updated_at AS private_note_updated_at,
            j.title, j.location, j.work_mode, j.job_type, j.description,
            j.required_skills, j.education_qualification AS required_education, j.experience_level,
            j.salary_min, j.salary_max, j.currency, j.salary_period AS salary_type,
            j.is_salary_negotiable AS is_negotiable, j.is_salary_negotiable,
            seeker.full_name AS candidate_name, seeker.email AS candidate_email, seeker.phone AS candidate_phone,
            jsp.education_level, jsp.education AS candidate_education, jsp.skills AS candidate_skills,
            jsp.experience_level AS candidate_experience_level, jsp.parsed_json_payload AS candidate_profile_payload,
            COALESCE(
              NULLIF(NULLIF(TRIM(j.company_name), ''), CONCAT(u.full_name, CHAR(39), 's Company')),
              NULLIF(NULLIF(TRIM(cp.company_name), ''), CONCAT(u.full_name, CHAR(39), 's Company')),
              NULLIF(NULLIF(TRIM(ep.company_name), ''), CONCAT(u.full_name, CHAR(39), 's Company')),
              'Company'
            ) AS company_name,
            COALESCE(cp.logo_url, ep.logo_url) AS company_logo,
            c.file_name AS resume_file_name, c.file_url AS resume_file_url,
            c.ai_extracted_data AS submitted_cv_data
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users u ON u.id = j.employer_id
     JOIN users seeker ON seeker.id = a.job_seeker_id
     LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = a.job_seeker_id
     LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
     LEFT JOIN employers ep ON ep.user_id = j.employer_id
     LEFT JOIN cvs c ON c.id = a.cv_id
     LEFT JOIN candidate_application_notes private_note ON private_note.application_id = a.id
     LEFT JOIN interviews i ON i.id = (
       SELECT MAX(latest_interview.id) FROM interviews latest_interview
       WHERE latest_interview.application_id = a.id
     )
     WHERE ${filters.join(' AND ')} ORDER BY ${orderBy}`,
    params
  );
  const applicationIds = rows.map((application) => application.id);
  const eventsByApplication = new Map();
  if (applicationIds.length) {
    const [events] = await db.query(
      `SELECT id, application_id, stage_name, status_note, created_at
       FROM application_timeline_events
       WHERE application_id IN (?)
       ORDER BY created_at ASC, id ASC`,
      [applicationIds]
    );
    events.forEach((event) => {
      const eventsForApplication = eventsByApplication.get(event.application_id) || [];
      eventsForApplication.push({
        id: event.id,
        stageName: event.stage_name,
        statusNote: event.status_note,
        createdAt: event.created_at,
      });
      eventsByApplication.set(event.application_id, eventsForApplication);
    });
  }
  const applications = rows.map((application) => {
    const snapshot = parseStoredJson(application.resume_snapshot, {});
    const cvData = parseStoredJson(application.submitted_cv_data, {});
    const profileData = parseStoredJson(application.candidate_profile_payload, {});
    const candidateSnapshot = snapshot.candidate || {};
    const candidateSkills = storedList(candidateSnapshot.skills).length
      ? storedList(candidateSnapshot.skills)
      : [
          ...storedList(application.candidate_skills),
          ...storedList(cvData.skills),
        ];
    const candidateEducation = storedList(candidateSnapshot.education).length
      ? storedList(candidateSnapshot.education)
      : [
          ...storedList(application.candidate_education),
          ...storedList(cvData.education),
        ];
    const candidateExperience = storedList(candidateSnapshot.experience).length
      ? storedList(candidateSnapshot.experience)
      : [
          ...storedList(profileData.experience),
          ...storedList(cvData.experience),
        ];
    const atsEvaluation = snapshot.atsEvaluation || calculateMatchScore({
      skills: candidateSkills,
      education: candidateEducation,
      experience: candidateExperience,
      cv: cvData,
      profile: {
        education_level: candidateSnapshot.educationLevel || application.education_level,
        experience_level: candidateSnapshot.experienceLevel || application.candidate_experience_level,
        education: candidateEducation,
        experience: candidateExperience,
      },
    }, snapshot.job || {
      title: application.title,
      description: application.description,
      requiredSkills: application.required_skills,
      required_education: application.required_education,
      experience_level: application.experience_level,
    });
    return {
      ...application,
      resumeSnapshot: snapshot,
      atsEvaluation,
      candidate: snapshot.candidate || {
        name: application.candidate_name || '',
        email: application.candidate_email || '',
        phone: application.candidate_phone || '',
        educationLevel: application.education_level || '',
        education: candidateEducation,
        skills: candidateSkills,
        experienceLevel: application.candidate_experience_level || '',
        experience: candidateExperience,
      },
      matchingSkills: snapshot.matchedSkills || atsEvaluation.matchedSkills,
      missingSkills: snapshot.missingSkills || atsEvaluation.missingSkills,
      jobId: application.job_id,
      jobTitle: application.title,
      company: application.company_name,
      companyLogo: application.company_logo,
      appliedAt: application.applied_at,
      updatedAt: application.updated_at,
      employerNotes: application.employer_notes,
      evaluatedAt: application.evaluated_at,
      aiMatchScore: atsEvaluation.overallScore,
      matchScore: atsEvaluation.overallScore,
      overallScore: atsEvaluation.overallScore,
      skillsMatch: atsEvaluation.skillsMatchScore,
      skillsMatchScore: atsEvaluation.skillsMatchScore,
      experienceMatch: atsEvaluation.experienceMatchScore,
      experienceMatchScore: atsEvaluation.experienceMatchScore,
      educationMatch: atsEvaluation.educationMatchScore,
      educationMatchScore: atsEvaluation.educationMatchScore,
      locationMatch: application.location_match_score,
      matchBreakdown: {
        skills: atsEvaluation.skillsMatchScore,
        experience: atsEvaluation.experienceMatchScore,
        education: atsEvaluation.educationMatchScore,
        overall: atsEvaluation.overallScore,
      },
      submittedResume: {
        fileName: snapshot.fileName || application.resume_file_name,
        fileUrl: snapshot.fileUrl || application.resume_file_url,
      },
      submittedResumeName: snapshot.fileName || application.resume_file_name,
      submittedResumeUrl: snapshot.fileUrl || application.resume_file_url,
      privateNote: application.private_note || '',
      privateNoteUpdatedAt: application.private_note_updated_at || null,
      coverLetter: application.seeker_cover_letter,
      interview: application.interview_id
        ? {
            id: application.interview_id,
            status: application.interview_status,
            candidateResponse: application.candidate_response,
            scheduledAt: application.interview_scheduled_at,
            type: application.interview_type,
            meetingUrl: application.interview_url,
            notes: application.interview_notes,
            durationMinutes: application.duration_minutes,
          }
        : null,
      timeline: eventsByApplication.get(application.id) || [{
        id: `applied-${application.id}`,
        stageName: 'Applied',
        statusNote: 'Application submitted.',
        createdAt: application.applied_at,
      }],
      lastActivityAt: (eventsByApplication.get(application.id) || []).at(-1)?.createdAt || application.updated_at || application.applied_at,
      salary: application.is_negotiable || application.is_salary_negotiable
        ? 'Negotiable'
        : application.salary_min || application.salary_max
          ? `${application.currency || 'ETB'} ${application.salary_min || ''}${application.salary_min && application.salary_max ? ' - ' : ''}${application.salary_max || ''}${application.salary_type ? ` / ${application.salary_type}` : ''}`
          : 'Salary not listed',
      job: snapshot.job || {
        id: application.job_id,
        title: application.title,
        company: application.company_name,
        location: application.location,
        description: application.description,
        job_type: application.job_type,
        work_mode: application.work_mode,
        required_skills: application.required_skills,
        required_education: application.required_education,
        experience_level: application.experience_level,
        salary_min: application.salary_min,
        salary_max: application.salary_max,
        currency: application.currency,
      },
    };
  });
  return {
    applications,
    counts: {
      all: Number(statusCounts.allCount || 0),
      pending: Number(statusCounts.pendingCount || 0),
      shortlisted: Number(statusCounts.shortlistedCount || 0),
      interview: Number(statusCounts.interviewCount || 0),
      hired: Number(statusCounts.hiredCount || 0),
      rejected: Number(statusCounts.rejectedCount || 0),
      withdrawn: Number(statusCounts.withdrawnCount || 0),
    },
  };
}

module.exports = { getProfile, upsertProfile, listByUser, addItem, deleteItem, getApplications };
