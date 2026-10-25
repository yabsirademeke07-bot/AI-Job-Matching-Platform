const seekerModel = require('../models/jobSeekerModel');
const db = require('../config/db');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { createNotification } = require('../services/databaseNotificationService');
const { notifyEmployerInterviewResponse } = require('../services/telegramNotifier');

const collections = {
  skills: { key: 'skills' },
  languages: { key: 'languages' }
};

async function getProfile(req, res) {
  try {
    const userId = await resolveAuthenticatedUserId(req);
    return res.json({ success: true, ...(await seekerModel.getProfile(userId)) });
  }
  catch (error) {
    console.error('Get seeker profile failed:', error.code || '', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load job seeker profile.' });
  }
}

async function resolveAuthenticatedUserId(req) {
  const claimedId = req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub || req.body?.userId || req.body?.user_id;
  if (claimedId) {
    const [rows] = await db.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [claimedId]);
    if (rows[0]) return rows[0].id;
  }
  const emails = [req.user?.email, req.body?.email, req.body?.fullEmail]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  for (const email of [...new Set(emails)]) {
    const [rows] = await db.execute('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
    if (rows[0]) return rows[0].id;
  }
  const error = new Error('Authenticated user was not found in the users table.');
  error.code = 'AUTH_USER_NOT_FOUND';
  throw error;
}

const textValue = (value) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return '';
  return String(value).trim();
};

const firstText = (...values) => values.map(textValue).find(Boolean) || '';
const waitForDatabaseWrite = () => new Promise((resolve) => setTimeout(resolve, 400));
const calculateProfileCompletion = (profile) => {
  const fields = [
    profile.fullName,
    profile.email,
    profile.phone,
    profile.city,
    profile.desiredPosition,
    profile.jobCategory,
    profile.experienceLevel,
    profile.workSetup,
    profile.jobType,
    profile.educationLevel,
    profile.expectedSalary && profile.expectedSalaryMax,
    profile.education.length > 0,
    profile.experience.length > 0,
    profile.skills.length > 0,
    profile.languages.length > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
};

function normalizeProfile(payload = {}) {
  const personal = payload.personal_info || {};
  const fullName = firstText(payload.fullName, payload.full_name, personal.fullName, personal.full_name);
  const location = firstText(payload.location, personal.location, payload.city, personal.city);
  const city = firstText(payload.city, personal.city, location.split(',')[0]);
  const rawPhone = firstText(payload.phone, personal.phone);
  const countryCode = firstText(
    payload.country_code,
    payload.countryCode,
    personal.country_code,
    personal.countryCode,
    rawPhone.match(/^\+\d{1,3}/)?.[0],
    '+251',
  );
  const phoneNumber = firstText(payload.phone_number, payload.phoneNumber, personal.phone_number, personal.phoneNumber)
    .replace(/\D/g, '');
  const rawSalary = firstText(payload.expectedSalary, payload.salaryExpectation, personal.expectedSalary);
  const rawMaximumSalary = firstText(payload.expectedSalaryMax, payload.salaryExpectationMax, personal.expectedSalaryMax);
  const numericSalary = Number(String(rawSalary).replace(/[^0-9.-]/g, ''));
  const numericMaximumSalary = Number(String(rawMaximumSalary).replace(/[^0-9.-]/g, ''));
  const skills = (Array.isArray(payload.skills) ? payload.skills : payload.skills ? [payload.skills] : [])
    .map((skill) => typeof skill === 'string' ? skill : skill?.skill_name || skill?.name)
    .map(textValue).filter(Boolean);
  const education = Array.isArray(payload.education) ? payload.education : textValue(payload.education) ? [{ school_name: 'Not specified', degree: textValue(payload.education), field_of_study: 'General', graduationYear: payload.graduationYear }] : [];
  const experience = Array.isArray(payload.experience) ? payload.experience : textValue(payload.experience) ? [{ company: 'Professional experience', role: textValue(payload.experience), description: textValue(payload.experienceDetail) }] : [];
  const languages = Array.isArray(payload.languages) ? payload.languages : payload.languages ? [payload.languages] : [];
  const certifications = Array.isArray(payload.certifications) ? payload.certifications : [];
  const experienceRole = firstText(payload.experienceRole, payload.experience_role);
  if (!experience.length && (experienceRole || payload.experienceDetail)) {
    experience.push({ role: experienceRole || 'Experience', description: textValue(payload.experienceDetail), company: 'Professional experience' });
  }
  const normalizedProfile = {
    fullName,
    email: firstText(payload.email, personal.email).toLowerCase(),
    phone: phoneNumber ? `${countryCode}${phoneNumber}` : rawPhone.replace(/[\s()-]/g, ''),
    country_code: countryCode,
    phone_number: phoneNumber,
    location,
    city,
    headline: firstText(payload.headline, personal.headline, payload.desiredPosition, payload.jobPreference),
    desiredPosition: firstText(payload.desiredPosition, payload.preferredJob, payload.jobPreference, payload.headline),
    jobPreference: firstText(payload.jobPreference, payload.preferredJob, payload.desiredPosition),
    jobCategory: firstText(payload.jobCategory, payload.jobPreference),
    experienceLevel: firstText(payload.experienceLevel),
    jobType: firstText(payload.jobType, payload.employmentType, personal.jobType, personal.employmentType),
    educationLevel: firstText(payload.educationLevel, payload.education_level, personal.educationLevel, personal.education_level),
    workSetup: firstText(payload.workSetup, payload.preferredWorkSetup, personal.workSetup),
    expectedSalary: Number.isFinite(numericSalary) && numericSalary > 0 ? Math.round(numericSalary) : null,
    expectedSalaryMax: Number.isFinite(numericMaximumSalary) && numericMaximumSalary > 0 ? Math.round(numericMaximumSalary) : null,
    bio: textValue(payload.bio || personal.bio).slice(0, 500),
    skills,
    education,
    experience,
    languages,
    certifications,
    graduationYear: firstText(payload.graduationYear),
  };
  normalizedProfile.completionPercentage = calculateProfileCompletion(normalizedProfile);
  return normalizedProfile;
}

function validateProfile(payload = {}) {
  return { errors: {}, value: normalizeProfile(payload) };
}

async function getAuditProfileSnapshot(userId) {
  try {
    const [[user]] = await db.execute('SELECT full_name, email, phone FROM users WHERE id = ? LIMIT 1', [userId]);
    const [[profile]] = await db.execute('SELECT headline, bio, location, city, job_category, experience_level, education_level, skills FROM job_seeker_profiles WHERE user_id = ? LIMIT 1', [userId]);
    let skills = [];
    try { skills = profile?.skills ? JSON.parse(profile.skills) : []; } catch {}
    return { full_name: user?.full_name || null, email: user?.email || null, phone: user?.phone || null, headline: profile?.headline || null, bio: profile?.bio || null, location: profile?.location || null, city: profile?.city || null, job_category: profile?.job_category || null, experience_level: profile?.experience_level || null, education_level: profile?.education_level || null, skills };
  } catch {
    return {};
  }
}

async function recordSeekerProfileAudit(req, userId, oldValues, newValues) {
  try {
    const changedFields = [...new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])]
      .filter((key) => JSON.stringify(oldValues?.[key] ?? null) !== JSON.stringify(newValues?.[key] ?? null));
    const description = `Updated seeker profile${changedFields.length ? `: ${changedFields.join(', ')}` : ''}`.slice(0, 255);
    await db.execute(`
      INSERT INTO user_activity_log
        (user_id, activity_type, description, details, ip_address, user_agent)
      VALUES (?, 'profile-update', ?, ?, ?, ?)
    `, [userId, description, JSON.stringify({ recordId: userId, oldValues: oldValues || {}, newValues: newValues || {}, ipAddress: req.ip, userAgent: req.get('user-agent') }), req.ip, req.get('user-agent')]);
  } catch (error) {
    console.warn('Seeker profile audit log skipped:', error.message);
  }
}

async function updateProfile(req, res) {
  const { errors, value } = validateProfile(req.body);
  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });
  try {
    const userId = await resolveAuthenticatedUserId(req);
    const oldValues = await getAuditProfileSnapshot(userId);
    const profile = await seekerModel.upsertProfile(userId, value);
    await waitForDatabaseWrite();
    await recordSeekerProfileAudit(req, userId, oldValues, await getAuditProfileSnapshot(userId));
    return res.json({ success: true, message: 'Profile saved successfully!', data: profile, profile, profileCompleted: true });
  } catch (error) {
    console.error('❌ SQL EXECUTION FAILED:');
    console.error('SQL Code:', error.code);
    console.error('SQL Message:', error.sqlMessage || error.message);
    console.error('Executed SQL Query:', error.sql || '[mysql2 did not expose the query text]');
    return res.status(500).json({ success: false, message: 'Unable to update job seeker profile.', error: error.sqlMessage || error.message, code: error.code });
  }
}

async function saveProfile(req, res) {
  try {
    const userId = await resolveAuthenticatedUserId(req);
    const oldValues = await getAuditProfileSnapshot(userId);
    const profile = await seekerModel.upsertProfile(userId, normalizeProfile(req.body));
    await waitForDatabaseWrite();
    await recordSeekerProfileAudit(req, userId, oldValues, await getAuditProfileSnapshot(userId));
    return res.json({ success: true, message: 'Profile saved successfully!', data: profile, profile, onboarding_completed: true, profileCompleted: true });
  } catch (error) {
    console.error('❌ SQL EXECUTION FAILED:');
    console.error('SQL Code:', error.code);
    console.error('SQL Message:', error.sqlMessage || error.message);
    console.error('Executed SQL Query:', error.sql || '[mysql2 did not expose the query text]');
    return res.status(500).json({ success: false, message: 'Unable to save your profile.', error: error.sqlMessage || error.message, code: error.code });
  }
}

async function updatePersonalInfo(req, res) {
  const personal = req.body || {};
  try {
    const oldValues = await getAuditProfileSnapshot(req.user.id);
    await db.execute(
      `UPDATE users SET full_name = COALESCE(NULLIF(?, ''), full_name),
       phone = ?, telegram_username = ? WHERE id = ?`,
      [String(personal.name || personal.full_name || '').trim(), personal.phone || null, String(personal.telegramUsername || personal.telegram_username || '').trim().replace(/^@/, '') || null, req.user.id]
    );
    await db.execute(
      `INSERT INTO job_seeker_profiles (user_id, headline, bio, location, city, country)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE headline = COALESCE(NULLIF(VALUES(headline), ''), headline),
       bio = COALESCE(VALUES(bio), bio), location = COALESCE(VALUES(location), location),
       city = COALESCE(VALUES(city), city), country = COALESCE(VALUES(country), country), updated_at = NOW()`,
      [req.user.id, personal.headline || '', personal.bio || null, personal.location || null, personal.city || null, personal.country || null]
    );
    await recordSeekerProfileAudit(req, req.user.id, oldValues, await getAuditProfileSnapshot(req.user.id));
    return res.json({ success: true, message: 'Personal information updated successfully.' });
  } catch (error) {
    console.error('Update seeker personal information failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update job seeker profile.' });
  }
}

async function uploadProfileAvatar(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: 'Choose a JPG, GIF, or PNG image under 2MB.' });
  const signatures = {
    'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
    'image/png': (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/gif': (buffer) => buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6)),
  };
  const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif' }[req.file.mimetype];
  if (!extension || !signatures[req.file.mimetype](req.file.buffer)) {
    return res.status(400).json({ success: false, message: 'The selected file is not a valid JPG, GIF, or PNG image.' });
  }

  const avatarDirectory = path.join(__dirname, '..', 'uploads', 'avatars');
  const filename = `${crypto.randomUUID()}${extension}`;
  const avatarUrl = `/uploads/avatars/${filename}`;
  try {
    await fs.mkdir(avatarDirectory, { recursive: true });
    await fs.writeFile(path.join(avatarDirectory, filename), req.file.buffer, { flag: 'wx' });
    await db.execute('UPDATE users SET avatar_url = ?, profile_picture_url = ? WHERE id = ?', [avatarUrl, avatarUrl, req.user.id]);
    return res.json({ success: true, avatarUrl });
  } catch (error) {
    await fs.unlink(path.join(avatarDirectory, filename)).catch(() => {});
    console.error('Profile avatar upload failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to upload profile photo.' });
  }
}

async function removeProfileAvatar(req, res) {
  try {
    const [[user]] = await db.execute('SELECT avatar_url, profile_picture_url FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    await db.execute('UPDATE users SET avatar_url = NULL, profile_picture_url = NULL WHERE id = ?', [req.user.id]);
    const previousUrl = user?.avatar_url || user?.profile_picture_url || '';
    const avatarPrefix = '/uploads/avatars/';
    if (previousUrl.startsWith(avatarPrefix)) {
      const filename = path.basename(previousUrl);
      await fs.unlink(path.join(__dirname, '..', 'uploads', 'avatars', filename)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Profile avatar removal failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to remove profile photo.' });
  }
}

async function updateSkills(req, res) {
  const submittedSkills = req.body?.skills;
  const skills = Array.isArray(submittedSkills)
    ? submittedSkills
    : Object.values(submittedSkills || {}).flat();
  try {
    const oldValues = await getAuditProfileSnapshot(req.user.id);
    const normalizedSkills = skills.flatMap((group) => Array.isArray(group) ? group : [group])
      .map((skill) => typeof skill === 'string' ? { skill_name: skill.trim() } : skill)
      .filter((skill) => skill?.skill_name || skill?.name);
    await db.query('UPDATE job_seeker_profiles SET skills = ?, updated_at = NOW() WHERE user_id = ?', [JSON.stringify(normalizedSkills), req.user.id]);
    await recordSeekerProfileAudit(req, req.user.id, oldValues, await getAuditProfileSnapshot(req.user.id));
    return res.json({ success: true, message: 'Skills updated successfully.' });
  } catch (error) {
    console.error('Update seeker skills failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update job seeker profile.' });
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
  try {
    const profile = await seekerModel.getProfile(req.user.id);
    return res.json({ success: true, [req.params.collection]: profile[collection.key] || [] });
  }
  catch (error) { return res.status(500).json({ success: false, message: 'Unable to load profile data.' }); }
}

async function addCollectionItem(req, res) {
  const collection = collections[req.params.collection];
  if (!collection) return res.status(404).json({ success: false, message: 'Unknown profile collection.' });
  try {
    const profile = await seekerModel.getProfile(req.user.id);
    const items = [...(profile[collection.key] || []), req.body];
    await db.query(`UPDATE job_seeker_profiles SET ${collection.key} = ?, updated_at = NOW() WHERE user_id = ?`, [JSON.stringify(items), req.user.id]);
    return res.status(201).json({ success: true, item: req.body });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to save profile data.' }); }
}

async function deleteCollectionItem(req, res) {
  const collection = collections[req.params.collection];
  if (!collection) return res.status(404).json({ success: false, message: 'Unknown profile collection.' });
  try {
    const profile = await seekerModel.getProfile(req.user.id);
    const items = (profile[collection.key] || []).filter((item, index) => String(item.id || index) !== String(req.params.id));
    await db.query(`UPDATE job_seeker_profiles SET ${collection.key} = ?, updated_at = NOW() WHERE user_id = ?`, [JSON.stringify(items), req.user.id]);
    return res.json({ success: true });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to delete profile data.' }); }
}

async function getApplications(req, res) {
  try {
    const result = await seekerModel.getApplications(req.user.id, {
      q: req.query.q || req.query.search,
      status: req.query.status,
      sort: req.query.sort,
    });
    return res.json({ success: true, ...result, metrics: result.counts });
  } catch (error) {
    console.error('Get seeker applications failed:', error.code || '', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load applications.' });
  }
}

async function getApplicationDetails(req, res) {
  try {
    const applicationId = Number(req.params.applicationId);
    if (!Number.isInteger(applicationId) || applicationId < 1) {
      return res.status(400).json({ success: false, message: 'A valid application id is required.' });
    }
    const { applications } = await seekerModel.getApplications(req.user.id, { applicationId });
    if (!applications.length) return res.status(404).json({ success: false, message: 'Application not found.' });
    return res.json({ success: true, application: applications[0], timeline: applications[0].timeline });
  } catch (error) {
    console.error('Get seeker application details failed:', error.code || '', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load application details.' });
  }
}

async function withdrawApplication(req, res) {
  const applicationId = Number(req.params.applicationId);
  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return res.status(400).json({ success: false, message: 'A valid application id is required.' });
  }
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);
  if (req.body?.reason && !reason) {
    return res.status(400).json({ success: false, message: 'Please provide a valid withdrawal reason.' });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      'SELECT id, status FROM applications WHERE id = ? AND job_seeker_id = ? FOR UPDATE',
      [applicationId, req.user.id],
    );
    const application = rows[0];
    if (!application) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    const currentStatus = String(application.status || '').toLowerCase();
    if (['hired', 'rejected', 'withdrawn'].includes(currentStatus)) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: `A ${currentStatus} application cannot be withdrawn.` });
    }
    await connection.execute("UPDATE applications SET status = 'withdrawn' WHERE id = ?", [applicationId]);
    await connection.execute(
      `INSERT INTO application_timeline_events (application_id, stage_name, status_note)
       VALUES (?, 'Withdrawn', ?)`,
      [applicationId, reason ? `Application withdrawn by candidate. Reason: ${reason}` : 'Application withdrawn by candidate.'],
    );
    await connection.commit();
    return res.json({ success: true, status: 'withdrawn' });
  } catch (error) {
    await connection.rollback();
    console.error('Withdraw seeker application failed:', error.code || '', error.message);
    return res.status(500).json({ success: false, message: 'Unable to withdraw this application.' });
  } finally {
    connection.release();
  }
}

async function saveApplicationNote(req, res) {
  const applicationId = Number(req.params.applicationId);
  const note = String(req.body?.note || '').trim();
  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return res.status(400).json({ success: false, message: 'A valid application id is required.' });
  }
  if (note.length > 5000) {
    return res.status(400).json({ success: false, message: 'Notes must be 5,000 characters or fewer.' });
  }
  try {
    const [owned] = await db.execute(
      'SELECT id FROM applications WHERE id = ? AND job_seeker_id = ? LIMIT 1',
      [applicationId, req.user.id],
    );
    if (!owned.length) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (!note) {
      await db.execute('DELETE FROM candidate_application_notes WHERE application_id = ?', [applicationId]);
      return res.json({ success: true, note: '' });
    }
    await db.execute(
      `INSERT INTO candidate_application_notes (application_id, note_text)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE note_text = VALUES(note_text), updated_at = NOW()`,
      [applicationId, note],
    );
    return res.json({ success: true, note });
  } catch (error) {
    console.error('Save candidate application note failed:', error.code || '', error.message);
    return res.status(500).json({ success: false, message: 'Unable to save your private note.' });
  }
}

async function getApplicationInterview(req, res) {
  const applicationId = Number(req.params.applicationId);
  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return res.status(400).json({ success: false, message: 'A valid application id is required.' });
  }
  try {
    const [rows] = await db.execute(
      `SELECT i.id, i.scheduled_at AS scheduledAt, i.interview_type AS type,
              i.interview_url AS meetingUrl, i.duration_minutes AS durationMinutes,
              i.interview_status AS status, i.candidate_response AS candidateResponse, i.notes,
              j.location AS jobLocation, j.title AS jobTitle
       FROM applications a
       JOIN interviews i ON i.application_id = a.id
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND a.job_seeker_id = ?
       ORDER BY i.scheduled_at DESC LIMIT 1`,
      [applicationId, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'No interview is scheduled for this application.' });
    return res.json({ success: true, interview: rows[0] });
  } catch (error) {
    console.error('Get candidate application interview failed:', error.code || '', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load interview details.' });
  }
}

async function requestInterviewReschedule(req, res) {
  const applicationId = Number(req.params.applicationId);
  const reason = String(req.body?.reason || '').trim().slice(0, 1000);
  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return res.status(400).json({ success: false, message: 'A valid application id is required.' });
  }
  if (!reason) return res.status(400).json({ success: false, message: 'Please provide a reason for your reschedule request.' });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT a.id, a.job_id AS jobId, j.employer_id AS employerId, j.title AS jobTitle,
              i.scheduled_at AS scheduledAt,
              candidate.full_name AS candidateName
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users candidate ON candidate.id = a.job_seeker_id
       JOIN interviews i ON i.application_id = a.id
       WHERE a.id = ? AND a.job_seeker_id = ?
       ORDER BY i.scheduled_at DESC LIMIT 1 FOR UPDATE`,
      [applicationId, req.user.id],
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Scheduled interview not found.' });
    }
    await connection.execute(
      `UPDATE interviews SET candidate_response = 'reschedule_requested' WHERE application_id = ?`,
      [applicationId],
    );
    await connection.execute(
      `INSERT INTO application_timeline_events (application_id, stage_name, status_note)
       VALUES (?, 'Reschedule Requested', ?)`,
      [applicationId, `Candidate requested an interview reschedule. Reason: ${reason}`],
    );
    await createNotification({
      executor: connection,
      userId: rows[0].employerId,
      type: 'INTERVIEW',
      title: 'Interview reschedule requested',
      message: `The candidate requested a new time for the ${rows[0].jobTitle} interview.`,
      referenceType: 'APPLICATION_STATUS',
      referenceId: applicationId,
      jobId: rows[0].jobId,
      applicationId,
      relatedUserId: req.user.id,
    });
    await connection.commit();
    if (rows[0].employerId) {
      try {
        await notifyEmployerInterviewResponse(rows[0].employerId, {
          applicationId,
          candidateName: rows[0].candidateName,
          jobTitle: rows[0].jobTitle,
          responseVerdict: 'requested a reschedule',
        });
      } catch (telegramError) {
        console.error('Telegram interview-response alert failed:', telegramError.message);
      }
    }
    return res.json({ success: true, message: 'Your reschedule request was sent to the employer.' });
  } catch (error) {
    await connection.rollback();
    console.error('Request interview reschedule failed:', error.code || '', error.message);
    return res.status(500).json({ success: false, message: 'Unable to send your reschedule request.' });
  } finally {
    connection.release();
  }
}

module.exports = { getProfile, updateProfile, saveProfile, updatePersonalInfo, updateSkills, uploadCv, uploadProfileAvatar, removeProfileAvatar, listCollection, addCollectionItem, deleteCollectionItem, getApplications, getApplicationDetails, withdrawApplication, saveApplicationNote, getApplicationInterview, requestInterviewReschedule };
