const db = require('../connection');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const employerDocumentDir = path.resolve(__dirname, '..', 'private', 'employer-documents');
const { createNotification } = require('../services/databaseNotificationService');
const { dispatchApplicationStatusWebhook } = require('../services/applicationStatusWebhook');
const smsService = require('../services/smsService');
const {
  dispatchPublishedJobNotifications,
  isPubliclyEligibleJob,
} = require('../services/telegramService');
const {
  notifyAdminNewJobSubmitted,
  notifyCandidateStatusUpdate,
  notifyCandidateInterviewScheduled,
  notifyCandidateNewMessage,
} = require('../services/telegramNotifier');

const normalizeApplicationStatus = (value) => {
  const status = String(value || '').trim().toLowerCase().replace(/_/g, ' ');
  if (['pending', 'pending review', 'applied', 'new'].includes(status)) return 'pending';
  if (['review', 'under review', 'under-review', 'in review'].includes(status)) return 'review';
  if (status === 'shortlisted') return 'shortlisted';
  if (['interview', 'interviewed', 'interview scheduled', 'interview-scheduled'].includes(status)) return 'interviewed';
  if (['hired', 'accepted', 'offer'].includes(status)) return 'hired';
  if (['rejected', 'declined'].includes(status)) return 'rejected';
  return status;
};

const recordProfileActivity = async (req, { userId, description, oldValues, newValues }) => {
  try {
    await db.execute(`
      INSERT INTO user_activity_log
        (user_id, activity_type, description, details, ip_address, user_agent)
      VALUES (?, 'profile-update', ?, ?, ?, ?)
    `, [userId, description.slice(0, 255), JSON.stringify({ recordId: userId, oldValues, newValues, ipAddress: req.ip, userAgent: req.get('user-agent') }), req.ip, req.get('user-agent')]);
  } catch (error) {
    console.warn('Profile audit log skipped:', error.message);
  }
};

const sendCandidateSmsAlert = async ({ applicationId, employerId, message }) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.job_seeker_id, u.phone,
              COALESCE(p.sms_alerts_enabled, TRUE) AS sms_alerts_enabled
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.job_seeker_id
       LEFT JOIN sms_notification_preferences p ON p.user_id = a.job_seeker_id
       WHERE a.id = ? AND j.employer_id = ?`,
      [applicationId, employerId],
    );
    const candidate = rows[0];
    if (!candidate || !candidate.sms_alerts_enabled) return;

    const phone = String(candidate.phone || '').replace(/[()\s-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      console.warn(`SMS alert skipped for application ${applicationId}: candidate phone is missing or invalid.`);
    }
    const result = await smsService.sendAndRecordSms({
      applicationId,
      senderEmployerId: employerId,
      recipientSeekerId: candidate.job_seeker_id,
      to: phone,
      body: message.slice(0, 160),
      skipReason: /^\+[1-9]\d{7,14}$/.test(phone) ? null : 'Candidate phone is missing or invalid.',
    });
    if (result.providerError) console.error('Automatic SMS alert failed:', result.providerError.message);
  } catch (error) {
    console.error('Unable to record automatic SMS alert:', error.message);
  }
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return text.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
};

const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const enrichEmployerApplicants = (applicants, requiredSkillsByJob) => applicants.map((applicant) => {
  const resumeSnapshot = parseJsonValue(applicant.resume_snapshot, {});
  const extractedData = parseJsonValue(
    applicant.ai_extracted_data,
    resumeSnapshot.extractedData || {},
  );
  const profileSkills = parseJsonValue(applicant.profile_skills, []);
  const cvSkills = parseJsonValue(
    applicant.extracted_skills,
    extractedData.skills || [],
  );
  const candidateSkills = [...new Set(
    [...(Array.isArray(profileSkills) ? profileSkills : []), ...(Array.isArray(cvSkills) ? cvSkills : [])]
      .map((skill) => typeof skill === 'string' ? skill : skill?.skill_name || skill?.name)
      .filter(Boolean),
  )];
  const requiredSkills = requiredSkillsByJob.get(String(applicant.job_id)) || [];
  const matchedSkills = requiredSkills.filter((required) =>
    candidateSkills.some((skill) => skill.toLowerCase() === required.toLowerCase()),
  );
  const missingSkills = requiredSkills.filter((required) =>
    !matchedSkills.some((matched) => matched.toLowerCase() === required.toLowerCase()),
  );

  return {
    ...applicant,
    candidateName: applicant.full_name,
    candidateId: applicant.job_seeker_id,
    jobTitle: applicant.job_title,
    candidateLocation: applicant.candidate_location,
    aiMatchScore: applicant.ai_match_score === null ? null : Number(applicant.ai_match_score),
    matchScore: applicant.ai_match_score === null ? null : Number(applicant.ai_match_score),
    skillsMatchScore: applicant.skills_match_score === null ? null : Number(applicant.skills_match_score),
    experienceMatchScore: applicant.experience_match_score === null ? null : Number(applicant.experience_match_score),
    domainMatchScore: applicant.domain_match_score === null ? null : Number(applicant.domain_match_score),
    educationMatchScore: applicant.education_match_score === null ? null : Number(applicant.education_match_score),
    softSkillsMatchScore: applicant.soft_skills_match_score === null ? null : Number(applicant.soft_skills_match_score),
    matchedSkills,
    candidateSkills,
    requiredSkills,
    missingSkills,
    educationLevel: applicant.education_level || '',
    experienceLevel: applicant.experience_level || '',
    requiredEducation: applicant.required_education || '',
    candidateSummary: applicant.headline || '',
    aiRecommendation: applicant.ai_recommendation || '',
    aiMatchSummary: applicant.ai_match_summary || '',
    experience: parseJsonValue(
      applicant.extracted_experience,
      extractedData.experience || [],
    ),
    education: parseJsonValue(
      applicant.extracted_education,
      extractedData.education || parseJsonValue(applicant.profile_education, []),
    ),
    resumeUrl: applicant.file_url || null,
  };
});

const normalizeNullableText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === '' ? null : text;
};

const normalizeOptionalNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return Boolean(value);
};

const normalizeOptionalDate = (value) => {
  const text = normalizeNullableText(value);
  return text && text.length >= 8 ? text : null;
};

const normalizeDeadlineDate = (value) => {
  const text = normalizeNullableText(value);
  if (!text) return null;
  const datePart = text.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (text.length > 10 && Number.isNaN(new Date(text).getTime())) return null;
  return datePart;
};

const normalizeScheduledDate = (value) => {
  const text = normalizeNullableText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ');
};

const normalizeJobPayload = (body = {}) => ({
  title: normalizeNullableText(body.title || body.jobTitle) || '',
  company_name: normalizeNullableText(body.company_name || body.companyName || body.company || body.employer_name) || '',
  description: normalizeNullableText(body.description),
  status: 'draft',
  sector: normalizeNullableText(body.sector || body.category || body.department || body.categoryName) || 'General',
  sub_sectors: normalizeNullableText(body.sub_sectors || body.subSectors || (Array.isArray(body.sub_sectors ?? body.subSectors) ? (body.sub_sectors ?? body.subSectors)[0] : body.sub_sectors ?? body.subSectors)),
  job_type: normalizeNullableText(body.job_type || body.jobType || body.job_type_name) || 'full-time',
  experience_level: normalizeNullableText(body.experience_level || body.experienceLevel || body.experience_level_name) || 'mid-level',
  location: normalizeNullableText(body.location || body.locationValue || body.city || 'Addis Ababa') || 'Addis Ababa',
  work_address: normalizeNullableText(body.work_address || body.workAddress || body.workLocation),
  state_province: normalizeNullableText(body.state_province || body.stateProvince),
  work_mode: (() => {
    const workMode = normalizeNullableText(body.work_mode || body.workMode || body.work_mode_name) || 'hybrid';
    const lowered = workMode.toLowerCase();
    if (lowered === 'all' || lowered === 'all workplaces' || lowered === 'any' || lowered === 'any / flexible') return 'hybrid';
    if (lowered === 'on-site' || lowered === 'onsite' || lowered === 'on site') return 'on-site';
    if (lowered === 'remote') return 'remote';
    return lowered;
  })(),
  gender_preference: normalizeNullableText(body.gender_preference || body.genderPreference || body.gender) || 'any',
  salary_min: normalizeOptionalNumber(body.salary_min ?? body.salaryMin ?? body.minimumSalary),
  salary_max: normalizeOptionalNumber(body.salary_max ?? body.salaryMax ?? body.maximumSalary),
  salary_period: (() => {
    const period = String(body.salary_period || body.salaryPeriod || body.salary_type || body.salaryType || 'monthly').toLowerCase();
    return ['hourly', 'monthly', 'yearly'].includes(period) ? period : 'monthly';
  })(),
  is_salary_negotiable: normalizeBoolean(body.is_salary_negotiable ?? body.is_negotiable, true),
  vacancies: normalizeOptionalNumber(body.vacancies) ?? 1,
  currency: normalizeNullableText(body.currency || body.compensation_currency) || 'ETB',
  benefits: normalizeNullableText(body.benefits),
  education_qualification: normalizeNullableText(body.education_qualification || body.educationQualification || body.required_education || body.requiredEducation || body.education) || 'Bachelor\'s Degree',
  deadline: normalizeDeadlineDate(body.deadline ?? body.applicationDeadline ?? body.application_deadline),
  scheduled_date: normalizeScheduledDate(body.scheduledAt ?? body.scheduledDate ?? body.scheduled_date),
  is_urgent: Boolean(body.is_urgent || body.isUrgent),
  required_skills: normalizeList(body.required_skills ?? body.requiredSkills ?? body.skills)
    .map((skill) => {
      const skillName = typeof skill === 'string'
        ? skill
        : skill?.skill_name || skill?.name || skill?.skill || '';
      return { ...(typeof skill === 'object' && skill ? skill : {}), skill_name: normalizeNullableText(skillName) };
    })
    .filter((skill) => skill.skill_name),
  required_languages: normalizeList(body.required_languages || body.requiredLanguages).map((language) => typeof language === 'string' ? { language_name: language } : language),
});

const getOwnedJob = async (connection, jobId, employerId) => {
  const [rows] = await connection.execute('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [jobId, employerId]);
  return rows[0] || null;
};

exports.getCompanyProfile = async (req, res) => {
  try {
    const [employmentRows] = await db.execute('SELECT * FROM employers WHERE user_id = ? OR userId = ? LIMIT 1', [req.user.id, req.user.id]);
    const [companyProfileRows] = await db.execute('SELECT * FROM company_profiles WHERE employer_id = ? LIMIT 1', [req.user.id]);
    const [householdRows] = await db.execute('SELECT * FROM household_employers WHERE user_id = ? LIMIT 1', [req.user.id]);
    const profile = companyProfileRows[0]
      ? { ...(employmentRows[0] || {}), ...companyProfileRows[0] }
      : employmentRows[0] || householdRows[0] || null;
    return res.json({ success: true, profile: profile || null });
  } catch (error) {
    console.error('Get Company Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch company profile.' });
  }
};

exports.uploadTinCertificate = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'A certificate file is required.' });
  const certificateUrl = `/api/employer/profile/tin-certificate/${path.basename(req.file.filename)}`;
  const certificateName = path.basename(req.file.originalname).replace(/[^\w.\- ]/g, '').slice(0, 255) || 'TIN certificate';
  try {
    const [result] = await db.execute(
      'UPDATE company_profiles SET tin_certificate_url = ?, tin_certificate_name = ? WHERE employer_id = ?',
      [certificateUrl, certificateName, req.user.id]
    );
    if (!result.affectedRows) {
      await fs.promises.unlink(req.file.path).catch((error) => {
        console.error('Unable to remove unassociated TIN certificate:', error.message);
      });
      return res.status(404).json({ success: false, message: 'Save the company profile before uploading its certificate.' });
    }
    return res.status(201).json({ success: true, url: certificateUrl, fileName: certificateName });
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch((unlinkError) => {
      console.error('Unable to remove failed TIN certificate upload:', unlinkError.message);
    });
    console.error('TIN certificate upload failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to save the TIN certificate.' });
  }
};

exports.getTinCertificate = async (req, res) => {
  const filename = path.basename(req.params.filename || '');
  const certificateUrl = `/api/employer/profile/tin-certificate/${filename}`;
  try {
    const [rows] = await db.execute(
      'SELECT tin_certificate_url FROM company_profiles WHERE employer_id = ? AND tin_certificate_url = ? LIMIT 1',
      [req.user.id, certificateUrl]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    return res.sendFile(filename, { root: employerDocumentDir });
  } catch (error) {
    console.error('TIN certificate retrieval failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load the TIN certificate.' });
  }
};

exports.uploadTradeLicense = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'A document file is required.' });
  const documentUrl = `/api/employer/profile/trade-license/${path.basename(req.file.filename)}`;
  const documentName = path.basename(req.file.originalname).replace(/[^\w.\- ]/g, '').slice(0, 255) || 'Business registration document';
  let officialDocument = null;
  let textExtracted = false;
  if (path.extname(req.file.originalname).toLowerCase() === '.pdf') {
    try {
      const { extractText } = require('../services/cvAnalysisService');
      const documentText = await extractText(req.file);
      textExtracted = Boolean(documentText.trim());
      const officialKeywords = [
        'ንግድ ፈቃድ',
        'የንግድ',
        'trade license',
        'commercial registration',
        'ministry of trade',
        'የንግድ ሚኒስቴር',
        'tin',
        'taxpayer',
        'revenue',
        'certificate of registration',
        'business license',
        'fdre',
        'federal democratic republic',
      ];
      if (textExtracted) {
        officialDocument = officialKeywords.some((keyword) =>
          documentText.toLowerCase().includes(keyword.toLowerCase())
        );
      }
    } catch (error) {
      console.warn('Unable to extract text from uploaded trade-license PDF:', error.message);
    }
  }
  try {
    const [result] = await db.execute(
      `UPDATE company_profiles
       SET trade_license_url = ?, trade_license_name = ?, trade_license_size_bytes = ?,
           trade_license_uploaded_at = NOW(), trade_license_official_document = ?
       WHERE employer_id = ?`,
      [documentUrl, documentName, req.file.size, officialDocument, req.user.id]
    );
    if (!result.affectedRows) {
      await fs.promises.unlink(req.file.path).catch((error) => {
        console.error('Unable to remove unassociated trade-license document:', error.message);
      });
      return res.status(404).json({ success: false, message: 'Save the company profile before uploading its document.' });
    }
    return res.status(201).json({
      success: true,
      url: documentUrl,
      fileName: documentName,
      fileSize: req.file.size,
      uploadedAt: new Date().toISOString(),
      officialDocument,
      textExtracted,
    });
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch((unlinkError) => {
      console.error('Unable to remove failed trade-license upload:', unlinkError.message);
    });
    console.error('Trade-license document upload failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to save the business document.' });
  }
};

exports.getTradeLicense = async (req, res) => {
  const filename = path.basename(req.params.filename || '');
  const documentUrl = `/api/employer/profile/trade-license/${filename}`;
  try {
    const [rows] = await db.execute(
      'SELECT trade_license_url FROM company_profiles WHERE employer_id = ? AND trade_license_url = ? LIMIT 1',
      [req.user.id, documentUrl]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Document not found.' });
    return res.sendFile(filename, { root: employerDocumentDir });
  } catch (error) {
    console.error('Trade-license document retrieval failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to load the business document.' });
  }
};

exports.updateCompanyProfile = async (req, res) => {
  const nullable = (value) => {
    const text = String(value ?? '').trim();
    return text || null;
  };
  try {
    const userId = req.user.id || req.user.userId;
    const data = req.body || {};
    const employerType = data.employerType || data.employer_type || 'company';
    const fullName = nullable(data.fullName || data.representative_name || data.representativeName);
    const workEmail = nullable(data.workEmail || data.work_email || data.email);
    const phone = nullable(data.phone || `${data.phoneCountryCode || ''}${data.phoneNumber || ''}`);

    if (employerType === 'individual') {
      console.log('--> Saving Household Profile for User:', userId);
      const householdName = nullable(data.householdName || data.companyName);
      const householdSize = nullable(data.householdMembers || data.companySize || data.company_size);
      const residenceLocation = nullable(data.residenceLocation || data.headquarters || data.headquartersLocation);
      if (!fullName || !phone || !householdName || !householdSize || !residenceLocation) {
        return res.status(400).json({ success: false, message: 'Household name, representative name, phone, household size, and residence are required.' });
      }
      let previousHousehold = {};
      try {
        const [previousRows] = await db.execute('SELECT full_name, phone_number, household_name, industry, residence_location FROM household_employers WHERE user_id = ? LIMIT 1', [userId]);
        previousHousehold = previousRows[0] || {};
      } catch {}
      await db.execute(
        `INSERT INTO household_employers (
          user_id, employer_type, full_name, role_relationship, work_email, phone_number,
          household_name, industry, household_members, residence_location, about_household, updated_at
        ) VALUES (?, 'individual', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name), role_relationship = VALUES(role_relationship),
          work_email = VALUES(work_email), phone_number = VALUES(phone_number),
          household_name = VALUES(household_name), industry = VALUES(industry),
          household_members = VALUES(household_members), residence_location = VALUES(residence_location),
          about_household = VALUES(about_household), updated_at = NOW()`,
        [userId, fullName, nullable(data.roleRelationship), workEmail, phone, householdName,
          nullable(data.industry) || 'Domestic & Home Services', householdSize,
          residenceLocation, nullable(data.aboutHousehold || data.aboutCompany)]
      );
      await db.execute('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
      const householdValues = { full_name: fullName, phone_number: phone, household_name: householdName, industry: nullable(data.industry) || 'Domestic & Home Services', residence_location: residenceLocation };
      const changedHouseholdFields = Object.keys(householdValues).filter((key) => String(previousHousehold[key] ?? '') !== String(householdValues[key] ?? ''));
      await recordProfileActivity(req, { userId, description: `Updated household profile${changedHouseholdFields.length ? `: ${changedHouseholdFields.join(', ')}` : ''}`, oldValues: previousHousehold, newValues: householdValues });
      return res.json({ success: true, message: 'Household employer profile saved successfully!' });
    }

    if (employerType !== 'company') {
      return res.status(400).json({ success: false, message: 'Unsupported employer type.' });
    }

    console.log('--> Saving Company Profile for User:', userId);
    const companyName = nullable(data.companyName || data.company_name || data.name);
    const jobTitle = nullable(data.jobTitle || data.position || data.representative_title);
    const companyPhone = phone;
    const tinNumber = nullable(data.tinNumber || data.tin_number || data.taxId);
    if (!tinNumber || !/^\d{10}$/.test(tinNumber) || /^(\d)\1{9}$/.test(tinNumber) || tinNumber === '1234567890') {
      return res.status(422).json({ success: false, message: 'Please enter a valid 10-digit Tax Identification Number (TIN).' });
    }
    const companyRegistrationNumber = nullable(data.companyRegistrationNumber || data.company_registration_number);
    const tradeLicenseNumber = nullable(data.tradeLicenseNumber || data.trade_license_number || companyRegistrationNumber);
    const tradeLicenseUrl = nullable(data.tradeLicenseUrl ?? data.trade_license_url ?? data.licenseDocumentUrl ?? data.license_document_url);
    const tradeLicenseName = nullable(data.trade_license_name || data.tradeLicenseName);
    const tradeLicenseSize = Number.isInteger(Number(data.trade_license_size_bytes)) ? Number(data.trade_license_size_bytes) || null : null;
    const tradeLicenseUploadedAt = nullable(data.trade_license_uploaded_at);
    const tradeLicenseOfficialDocument = typeof data.trade_license_official_document === 'boolean' ? data.trade_license_official_document : null;
    const tradeDoc = tradeLicenseUrl || tradeLicenseNumber;
    const industry = nullable(data.industry);
    const companySize = nullable(data.companySize || data.company_size);
    const headquarters = nullable(data.headquarters || data.headquartersLocation || data.location);
    const website = nullable(data.website);
    const socialMedia = data.socialMedia || data.social_media_urls ? JSON.stringify(data.socialMedia || data.social_media_urls) : null;
    const aboutCompany = nullable(data.aboutCompany || data.description || data.company_summary);
    if (!companyName || !fullName || !companyPhone || !companySize || !industry || !headquarters) {
      return res.status(400).json({ success: false, message: 'Company name, representative, phone, company size, industry, and headquarters are required.' });
    }
    let previousCompany = {};
    try {
      const [previousRows] = await db.execute('SELECT company_name, representative_name, phone, industry, location, website, description FROM company_profiles WHERE employer_id = ? LIMIT 1', [userId]);
      previousCompany = previousRows[0] || {};
    } catch {}
    await db.execute(
      `INSERT INTO employers (
        user_id, userId, employer_type, full_name, representative_name, job_title, representative_title,
        work_email, phone_number, company_name, tin_number, trade_license_document, industry,
        companySize, company_size, headquarters_location, website, social_media, about_company, verification_status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name), representative_name = VALUES(representative_name),
        job_title = VALUES(job_title), representative_title = VALUES(representative_title),
        work_email = VALUES(work_email), phone_number = VALUES(phone_number), company_name = VALUES(company_name),
        tin_number = VALUES(tin_number), trade_license_document = COALESCE(VALUES(trade_license_document), trade_license_document),
        industry = VALUES(industry), companySize = VALUES(companySize), company_size = VALUES(company_size), headquarters_location = VALUES(headquarters_location),
        website = VALUES(website), social_media = VALUES(social_media), about_company = VALUES(about_company),
        verification_status = VALUES(verification_status), updated_at = NOW()`,
      [userId, userId, employerType, fullName, fullName, jobTitle, jobTitle, workEmail, companyPhone, companyName, tinNumber,
        tradeDoc, industry, companySize, companySize, headquarters, website, socialMedia, aboutCompany, 'Pending']
    );
    await db.execute(
      `INSERT INTO company_profiles (
        employer_id, company_name, representative_name, representative_title, employer_type,
        work_email, phone, tin_number, tin_certificate_url, tin_certificate_name, company_registration_number, trade_license_number, trade_license_url,
        trade_license_name, trade_license_size_bytes, trade_license_uploaded_at, trade_license_official_document, industry,
        company_size, website, description, company_summary, location, social_media_urls,
        hiring_volume, linkedin, onboarding_completed, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'pending')
      ON DUPLICATE KEY UPDATE
        company_name = VALUES(company_name), representative_name = VALUES(representative_name),
        representative_title = VALUES(representative_title), employer_type = VALUES(employer_type),
        work_email = VALUES(work_email), phone = VALUES(phone), tin_number = VALUES(tin_number),
        tin_certificate_url = VALUES(tin_certificate_url), tin_certificate_name = VALUES(tin_certificate_name),
        company_registration_number = VALUES(company_registration_number),
        trade_license_number = VALUES(trade_license_number), trade_license_url = VALUES(trade_license_url),
        trade_license_name = VALUES(trade_license_name), trade_license_size_bytes = VALUES(trade_license_size_bytes),
        trade_license_uploaded_at = VALUES(trade_license_uploaded_at),
        trade_license_official_document = VALUES(trade_license_official_document),
        industry = VALUES(industry), company_size = VALUES(company_size), website = VALUES(website),
        description = VALUES(description), company_summary = VALUES(company_summary), location = VALUES(location),
        social_media_urls = VALUES(social_media_urls), hiring_volume = VALUES(hiring_volume),
        linkedin = VALUES(linkedin), onboarding_completed = TRUE, verification_status = 'pending', updated_at = NOW()` ,
      [userId, companyName, fullName, jobTitle, employerType, workEmail, companyPhone, tinNumber,
        nullable(data.tin_certificate_url),
        nullable(data.tin_certificate_name),
        companyRegistrationNumber, tradeLicenseNumber, tradeLicenseUrl, tradeLicenseName,
        tradeLicenseSize, tradeLicenseUploadedAt, tradeLicenseOfficialDocument,
        industry, companySize, website, aboutCompany, aboutCompany, headquarters, socialMedia,
        nullable(data.hiringVolume || data.hiring_volume), nullable(data.linkedin)]
    );
    await db.execute('UPDATE users SET phone = ?, employer_onboarded = TRUE WHERE id = ?', [companyPhone, userId]);
    await db.execute("INSERT INTO user_activity_log (user_id, activity_type) VALUES (?, 'profile-update')", [req.user.id]).catch(() => {});
    const companyValues = { company_name: companyName, representative_name: fullName, phone: companyPhone, industry, location: headquarters, website, description: aboutCompany };
    const changedCompanyFields = Object.keys(companyValues).filter((key) => String(previousCompany[key] ?? '') !== String(companyValues[key] ?? ''));
    await recordProfileActivity(req, { userId: req.user.id, description: `Updated company profile${changedCompanyFields.length ? `: ${changedCompanyFields.join(', ')}` : ''}`, oldValues: previousCompany, newValues: companyValues });
    return res.json({ success: true, message: 'Company profile saved successfully!' });
  } catch (error) {
    console.error('--> [PROFILE SAVE ERROR]:', error.message);
    const message = process.env.NODE_ENV === 'production'
      ? 'Unable to save profile to database. Please try again.'
      : `Unable to save profile to database: ${error.message}`;
    return res.status(500).json({ success: false, message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [jobStats] = await db.execute(`SELECT COUNT(*) total_jobs, SUM(status = 'published') active_jobs, SUM(view_count) total_views, SUM(application_count) total_applications FROM jobs WHERE employer_id = ?`, [req.user.id]);
    const [appStats] = await db.execute(`SELECT COUNT(a.id) total_candidates, SUM(a.status = 'applied') new_applied, SUM(a.status = 'under-review') under_review, SUM(a.status = 'shortlisted') shortlisted, SUM(a.status = 'interview') interview_scheduled, SUM(a.status = 'hired') hired, AVG(a.ai_match_score) avg_match_score FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.employer_id = ?`, [req.user.id]);
    return res.json({ success: true, stats: { ...jobStats[0], ...appStats[0] } });
  } catch (error) {
    console.error('Employer Stats Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard metrics.' });
  }
};

exports.getEmployerDashboardStats = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         (SELECT COUNT(*) FROM jobs j
          WHERE j.employer_id = ?
            AND LOWER(j.status) IN ('active', 'published', 'open')) AS active_jobs,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ?) AS total_applicants,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ? AND a.ai_match_score >= 80) AS high_ai_matches,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ? AND LOWER(a.status) = 'pending') AS pending,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ?
            AND LOWER(REPLACE(a.status, '_', ' ')) IN ('review', 'in review')) AS review,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ?
            AND LOWER(REPLACE(a.status, '_', '-')) IN ('pending', 'applied', 'new')) AS pending_review,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ? AND LOWER(a.status) = 'shortlisted') AS shortlisted,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ?
            AND LOWER(REPLACE(a.status, '_', '-')) IN ('interview', 'interviewed', 'interview-scheduled')) AS interviews_scheduled,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ?
            AND LOWER(REPLACE(a.status, '_', '-')) IN ('hired', 'accepted', 'offer')) AS hired,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ?
            AND a.applied_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
            AND a.applied_at < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)) AS new_this_week`,
      Array(10).fill(req.user.id),
    );

    const row = rows[0] || {};
    return res.json({
      success: true,
      stats: {
        active_jobs: normalizePipelineCounts(row.active_jobs),
        total_applicants: normalizePipelineCounts(row.total_applicants),
        high_ai_matches: normalizePipelineCounts(row.high_ai_matches),
        pending: normalizePipelineCounts(row.pending),
        review: normalizePipelineCounts(row.review),
        pending_review: normalizePipelineCounts(row.pending_review),
        shortlisted: normalizePipelineCounts(row.shortlisted),
        interviews_scheduled: normalizePipelineCounts(row.interviews_scheduled),
        hired: normalizePipelineCounts(row.hired),
        new_this_week: normalizePipelineCounts(row.new_this_week),
      },
    });
  } catch (error) {
    console.error('Employer Dashboard Stats Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve employer dashboard stats.' });
  }
};

exports.getDashboardOverview = async (req, res) => {
  try {
    const [jobStats] = await db.execute(
      `SELECT COUNT(*) AS totalJobs, SUM(CASE WHEN status IN ('published', 'active') THEN 1 ELSE 0 END) AS activeJobs, SUM(view_count) AS totalViews FROM jobs WHERE employer_id = ?`,
      [req.user.id]
    );
    const [appStats] = await db.execute(
      `SELECT COUNT(*) AS totalApplicants, SUM(CASE WHEN status IN ('pending', 'applied', 'new') THEN 1 ELSE 0 END) AS newApplicants, SUM(CASE WHEN status IN ('review', 'shortlisted', 'interview', 'interviewed') THEN 1 ELSE 0 END) AS shortlistedOrInterviewing, AVG(COALESCE(ai_match_score, 0)) AS avgAiMatch FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.employer_id = ?`,
      [req.user.id]
    );
    const [recentApplications] = await db.execute(
      `SELECT a.id, a.status, a.ai_match_score AS aiMatchScore, a.applied_at AS appliedAt, u.full_name AS candidateName, u.email AS candidateEmail, j.title AS jobTitle FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.job_seeker_id WHERE j.employer_id = ? ORDER BY a.applied_at DESC LIMIT 8`,
      [req.user.id]
    );
    const [profileRows] = await db.execute('SELECT * FROM employers WHERE user_id = ? OR userId = ? LIMIT 1', [req.user.id, req.user.id]);
    const [householdProfileRows] = await db.execute('SELECT * FROM household_employers WHERE user_id = ? LIMIT 1', [req.user.id]);
    const [settingsRows] = await db.execute('SELECT * FROM employer_settings WHERE userId = ?', [req.user.id]);

    const stats = {
      activeJobs: Number(jobStats[0]?.activeJobs || 0),
      totalJobs: Number(jobStats[0]?.totalJobs || 0),
      totalApplicants: Number(appStats[0]?.totalApplicants || 0),
      newApplicants: normalizePipelineCounts(appStats[0]?.newApplicants),
      shortlistedOrInterviewing: normalizePipelineCounts(appStats[0]?.shortlistedOrInterviewing),
      avgAiMatch: Number(appStats[0]?.avgAiMatch || 0),
    };

    return res.json({
      success: true,
      stats,
      profile: profileRows[0] || householdProfileRows[0] || null,
      settings: settingsRows[0] || null,
      recentApplications,
    });
  } catch (error) {
    console.error('Employer Dashboard Overview Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard overview.' });
  }
};

async function resolveEmployerJobIds(userId, userEmail) {
  const params = [];
  const clauses = [];
  const [columns] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'jobs'
       AND COLUMN_NAME IN ('employer_id', 'user_id', 'created_by')`,
  );
  const availableColumns = new Set(columns.map((column) => column.COLUMN_NAME));

  if (userId !== undefined && userId !== null && userId !== '') {
    if (availableColumns.has('employer_id')) {
      clauses.push('jobs.employer_id = ?');
      params.push(userId);
    }
    if (availableColumns.has('user_id')) {
      clauses.push('jobs.user_id = ?');
      params.push(userId);
    }
    if (availableColumns.has('created_by')) {
      clauses.push('jobs.created_by = ?');
      params.push(userId);
    }
  }

  if (userEmail) {
    if (availableColumns.has('employer_id')) {
      clauses.push('jobs.employer_id = (SELECT id FROM users WHERE email = ? LIMIT 1)');
      params.push(userEmail);
    }
    if (availableColumns.has('user_id')) {
      clauses.push('jobs.user_id = (SELECT id FROM users WHERE email = ? LIMIT 1)');
      params.push(userEmail);
    }
    if (availableColumns.has('created_by')) {
      clauses.push('jobs.created_by = (SELECT id FROM users WHERE email = ? LIMIT 1)');
      params.push(userEmail);
    }
  }

  if (!clauses.length) {
    return [];
  }

  const [jobs] = await db.query(
    `SELECT id, title
     FROM jobs
     WHERE ${clauses.join(' OR ')}
     ORDER BY id DESC`,
    params,
  );

  return [...new Set(jobs.map((job) => Number(job.id)).filter((jobId) => Number.isInteger(jobId) && jobId > 0))];
}

async function getAvailableColumns(tableName) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName],
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

exports.getEmployerApplications = async (req, res) => {
  const employerId = req.user?.id;
  if (!employerId) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Please log in as an employer.' });
  }

  try {
    const [allApps] = await db.query(
      'SELECT * FROM applications WHERE employer_id = ?',
      [employerId],
    );

    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const jobId = String(req.query.job_id || 'all').trim();
    if (jobId !== 'all' && !/^\d+$/.test(jobId)) {
      return res.status(400).json({ success: false, message: 'A valid job id is required.' });
    }

    const effectiveJobIds = [...new Set(allApps.map((application) => Number(application.job_id))
      .filter((id) => Number.isInteger(id) && id > 0))];

    if (!effectiveJobIds.length) {
      return res.json({
        success: true,
        counts: { all: 0, pending: 0, review: 0, highMatch: 0, shortlisted: 0, interview: 0, hired: 0, rejected: 0 },
        applicants: [],
        message: 'No jobs found for this employer.',
      });
    }

    const conditions = [`a.job_id IN (${effectiveJobIds.map(() => '?').join(', ')})`];
    const params = [...effectiveJobIds];
    if (jobId !== 'all') {
      conditions.push('a.job_id = ?');
      params.push(jobId);
    }
    if (status && status !== 'all') {
      if (status === 'high_match') {
        conditions.push('a.ai_match_score >= ?');
        params.push(80);
      } else if (['review', 'in_review'].includes(status)) {
        conditions.push("LOWER(REPLACE(a.status, '_', ' ')) IN ('review', 'in review', 'under-review', 'under review')");
      } else if (status === 'interview') {
        conditions.push("LOWER(a.status) IN ('interview', 'interviewed', 'interview-scheduled', 'interview scheduled')");
      } else {
        conditions.push('LOWER(a.status) = ?');
        params.push(status);
      }
    }
    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`;
      conditions.push(`(
        LOWER(u.full_name) LIKE ?
        OR LOWER(u.email) LIKE ?
        OR LOWER(j.title) LIKE ?
        OR LOWER(COALESCE(CAST(jsp.skills AS CHAR), '')) LIKE ?
        OR LOWER(COALESCE(CAST(ca.extracted_skills AS CHAR), '')) LIKE ?
      )`);
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const applicationColumns = await getAvailableColumns('applications');
    const profileColumns = await getAvailableColumns('job_seeker_profiles');
    const cvAnalysisColumns = await getAvailableColumns('cv_analysis');
    const interviewColumns = await getAvailableColumns('interviews');

    const selectedApplicationFields = [
      'a.id AS application_id',
      'a.job_id',
      'a.job_seeker_id',
      'a.status',
      'a.ai_match_score',
      'a.applied_at',
      'a.resume_snapshot',
      'a.employer_notes',
      'u.full_name',
      'u.email',
      'u.phone',
      'u.avatar_url',
      'j.title AS job_title',
      'j.education_qualification AS required_education',
    ];

    if (applicationColumns.has('skills_match_score')) selectedApplicationFields.push('a.skills_match_score');
    if (applicationColumns.has('experience_match_score')) selectedApplicationFields.push('a.experience_match_score');
    if (applicationColumns.has('title_match_score')) selectedApplicationFields.push('a.title_match_score');
    if (applicationColumns.has('domain_match_score')) selectedApplicationFields.push('a.domain_match_score');
    if (applicationColumns.has('education_match_score')) selectedApplicationFields.push('a.education_match_score');
    if (applicationColumns.has('soft_skills_match_score')) selectedApplicationFields.push('a.soft_skills_match_score');
    if (applicationColumns.has('location_match_score')) selectedApplicationFields.push('a.location_match_score');
    if (applicationColumns.has('seeker_cover_letter')) selectedApplicationFields.push('a.seeker_cover_letter');
    if (applicationColumns.has('ai_recommendation')) selectedApplicationFields.push('a.ai_recommendation');
    if (applicationColumns.has('ai_match_summary')) selectedApplicationFields.push('a.ai_match_summary');
    if (applicationColumns.has('ai_strengths')) selectedApplicationFields.push('a.ai_strengths');
    if (applicationColumns.has('ai_missing_skills')) selectedApplicationFields.push('a.ai_missing_skills');
    if (profileColumns.has('headline')) selectedApplicationFields.push('jsp.headline');
    if (profileColumns.has('location')) selectedApplicationFields.push('jsp.location AS candidate_location');
    if (profileColumns.has('skills')) selectedApplicationFields.push('jsp.skills AS profile_skills');
    if (profileColumns.has('experience_level')) selectedApplicationFields.push('jsp.experience_level');
    if (profileColumns.has('education')) selectedApplicationFields.push('jsp.education AS profile_education');
    if (profileColumns.has('education_level')) selectedApplicationFields.push('jsp.education_level');
    if (profileColumns.has('candidate_summary')) selectedApplicationFields.push('jsp.candidate_summary');
    if (cvAnalysisColumns.has('extracted_skills')) selectedApplicationFields.push('ca.extracted_skills');
    if (cvAnalysisColumns.has('extracted_experience')) selectedApplicationFields.push('ca.extracted_experience');
    if (cvAnalysisColumns.has('extracted_education')) selectedApplicationFields.push('ca.extracted_education');
    selectedApplicationFields.push('c.id AS cv_id', 'c.file_name', 'c.file_url', 'c.ai_extracted_data');
    if (interviewColumns.has('id')) selectedApplicationFields.push('i.id AS interview_id');
    if (interviewColumns.has('scheduled_at')) selectedApplicationFields.push('i.scheduled_at AS interview_scheduled_at');
    if (interviewColumns.has('interview_status')) selectedApplicationFields.push('i.interview_status');
    if (interviewColumns.has('interview_type')) selectedApplicationFields.push('i.interview_type');
    if (interviewColumns.has('interview_url')) selectedApplicationFields.push('i.interview_url');

    const [rows] = await db.execute(
      `SELECT ${selectedApplicationFields.join(', ')}
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.job_seeker_id
       LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
       LEFT JOIN cvs c ON c.id = COALESCE(
         a.cv_id,
         (SELECT cv.id FROM cvs cv WHERE cv.user_id = u.id AND cv.is_primary = TRUE ORDER BY cv.upload_date DESC LIMIT 1)
       )
       LEFT JOIN cv_analysis ca ON ca.cv_id = c.id
       LEFT JOIN interviews i ON i.application_id = a.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.applied_at DESC`,
      params,
    );

    const countConditions = [`a.job_id IN (${effectiveJobIds.map(() => '?').join(', ')})`];
    const countParams = [...effectiveJobIds];
    if (jobId !== 'all') {
      countConditions.push('a.job_id = ?');
      countParams.push(jobId);
    }
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total_count,
              SUM(CASE WHEN LOWER(a.status) IN ('pending', 'applied', 'new', 'pending review') THEN 1 ELSE 0 END) AS pending_count,
              SUM(CASE WHEN LOWER(a.status) IN ('review', 'under-review', 'under review', 'in review') THEN 1 ELSE 0 END) AS review_count,
              SUM(CASE WHEN a.ai_match_score >= 80 THEN 1 ELSE 0 END) AS high_match_count,
              SUM(CASE WHEN LOWER(a.status) = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count,
              SUM(CASE WHEN LOWER(a.status) IN ('interview', 'interviewed', 'interview-scheduled', 'interview scheduled') THEN 1 ELSE 0 END) AS interview_count,
              SUM(CASE WHEN LOWER(a.status) IN ('hired', 'accepted', 'offer') THEN 1 ELSE 0 END) AS hired_count,
              SUM(CASE WHEN LOWER(a.status) IN ('rejected', 'declined') THEN 1 ELSE 0 END) AS rejected_count
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE ${countConditions.join(' AND ')}`,
      countParams,
    );
    const jobIds = [...new Set(rows.map((row) => String(row.job_id)))];
    const requiredSkillsByJob = new Map();
    if (jobIds.length) {
      const placeholders = jobIds.map(() => '?').join(', ');
      const [requiredSkillRows] = await db.execute(
        `SELECT job_id, skill_name FROM job_required_skills WHERE job_id IN (${placeholders}) ORDER BY skill_name ASC`,
        jobIds,
      );
      for (const row of requiredSkillRows) {
        const key = String(row.job_id);
        requiredSkillsByJob.set(key, [...(requiredSkillsByJob.get(key) || []), row.skill_name]);
      }
    }
    const applications = enrichEmployerApplicants(rows, requiredSkillsByJob);
    const rawCounts = countRows[0] || {};
    const counts = {
      all: Number(rawCounts.total_count || 0),
      pending: Number(rawCounts.pending_count || 0),
      review: Number(rawCounts.review_count || 0),
      highMatch: Number(rawCounts.high_match_count || 0),
      shortlisted: Number(rawCounts.shortlisted_count || 0),
      interview: Number(rawCounts.interview_count || 0),
      hired: Number(rawCounts.hired_count || 0),
      rejected: Number(rawCounts.rejected_count || 0),
    };
    return res.json({ success: true, counts, applications, applicants: applications });
  } catch (error) {
    console.error('Employer Applications MySQL query error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
  }
};

exports.createJob = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const job = normalizeJobPayload(req.body);
    const companyName = normalizeNullableText(job.company_name || req.body.company_name || req.body.company || req.body.companyName || '') || '';
    if (!job.title || !companyName || !job.description || !job.deadline) {
      return res.status(400).json({ success: false, message: 'Title, company name, description, and a valid application deadline are required.' });
    }
    job.company_name = companyName;
    if (job.deadline < new Date().toISOString().slice(0, 10)) return res.status(400).json({ success: false, message: 'Application deadline must be today or a future date.' });
    if (job.salary_min !== null && job.salary_min < 0 || job.salary_max !== null && job.salary_max < 0) {
      return res.status(400).json({ success: false, message: 'Salary amounts cannot be negative.' });
    }
    if (!Number.isInteger(job.vacancies) || job.vacancies < 1) return res.status(400).json({ success: false, message: 'Vacancies must be a whole number of at least 1.' });
    if (job.salary_min !== null && job.salary_max !== null && job.salary_max < job.salary_min) {
      return res.status(400).json({ success: false, message: 'Maximum salary must be greater than or equal to minimum salary.' });
    }
    const requiredSkillsText = job.required_skills.map((skill) => skill.skill_name).join(', ');
    const requestedStatus = String(req.body.status || 'draft').trim().toLowerCase();
    const isSubmitting = ['pending', 'pending_approval', 'published', 'active', 'scheduled'].includes(requestedStatus);
    await connection.beginTransaction();
    const slug = `${job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;
    const [result] = await connection.execute(`
      INSERT INTO jobs (
        employer_id, title, company_name, slug, description, sector, sub_sectors,
        job_type, experience_level, location, work_address, state_province,
        work_mode, gender_preference, salary_min, salary_max, currency, salary_period,
        is_salary_negotiable, benefits, education_qualification, vacancies, deadline,
        scheduled_date, is_urgent, required_skills, status, approval_status, is_approved, is_active, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', FALSE, FALSE, NULL)
    `, [req.user.id, job.title, companyName, slug, job.description, job.sector, job.sub_sectors,
      job.job_type, job.experience_level, job.location, job.work_address, job.state_province,
      job.work_mode, job.gender_preference, job.salary_min, job.salary_max,
      job.currency, job.salary_period, job.is_salary_negotiable, job.benefits,
      job.education_qualification, job.vacancies, job.deadline, job.scheduled_date, job.is_urgent, requiredSkillsText,
      isSubmitting ? 'pending' : 'draft']);
    const jobId = result.insertId;
    for (const skill of job.required_skills) if (skill.skill_name) await connection.execute('INSERT INTO job_required_skills (job_id, skill_name, proficiency_level, is_must_have) VALUES (?, ?, ?, ?)', [jobId, String(skill.skill_name).trim(), skill.proficiency_level || 'intermediate', Boolean(skill.is_must_have)]);
    for (const language of job.required_languages) if (language.language_name) await connection.execute('INSERT INTO job_required_languages (job_id, language_name, proficiency, is_must_have) VALUES (?, ?, ?, ?)', [jobId, String(language.language_name).trim(), language.proficiency || 'professional-working', Boolean(language.is_must_have)]);
    await connection.execute('INSERT INTO job_analytics (job_id) VALUES (?)', [jobId]);
    await connection.commit();
    const [rows] = await connection.execute("SELECT *, DATE_FORMAT(scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt FROM jobs WHERE id = ?", [jobId]);
    let telegramNotification = { sent: false, message: 'Telegram alert was not sent.' };
    if (isSubmitting) {
      try {
        await notifyAdminNewJobSubmitted({ ...rows[0], jobId });
        telegramNotification = { sent: true, message: 'Job submission alert sent to the admin Telegram chat.' };
      } catch (telegramError) {
        console.error('Telegram job submission alert failed:', telegramError.message);
        telegramNotification = { sent: false, message: 'Job saved, but the Telegram alert could not be delivered.' };
      }
    }
    return res.status(201).json({
      success: true,
      ...rows[0],
      isScheduled: Boolean(job.scheduled_date),
      jobId,
      id: jobId,
      slug,
      telegramNotification,
    });
  } catch (error) {
    await connection.rollback();
    const sqlError = error?.sqlMessage || error?.message || 'Unknown database error';
    console.error('Create Employer Job Error:', sqlError);
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to save job.', error: sqlError });
  } finally { connection.release(); }
};

exports.getEmployerJobs = async (req, res) => {
  try {
    const employerId = req.user?.id;
    const employerEmail = req.user?.email;
    if (!employerId) {
      return res.status(401).json({ success: false, message: 'Employer access required.' });
    }
    const ownedJobIds = await resolveEmployerJobIds(employerId, employerEmail);
    if (!ownedJobIds.length) {
      return res.json({ success: true, jobs: [] });
    }

    const placeholders = ownedJobIds.map(() => '?').join(', ');
    const [jobs] = await db.execute(
      `SELECT j.*, DATE_FORMAT(j.scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt,
              COUNT(a.id) AS applicantsCount,
              COALESCE(SUM(a.status = 'pending' OR a.status = 'applied' OR a.status = 'pending_review'), 0) AS pendingCount,
              COALESCE(SUM(a.status = 'shortlisted'), 0) AS shortlisted,
              COALESCE(SUM(a.status = 'interviewed' OR a.status = 'interview'), 0) AS interviewCount,
              COALESCE(SUM(a.status = 'hired'), 0) AS hiredCount
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.id IN (${placeholders})
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      ownedJobIds,
    );
    return res.json({ success: true, jobs: jobs.map((job) => ({
      ...job,
      isScheduled: Boolean(job.scheduled_date),
    })) });
  } catch (error) {
    console.error('Get Employer Jobs Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve jobs.' });
  }
};

exports.updateJob = async (req, res) => {
  const job = normalizeJobPayload(req.body);
  if (!job.title || !job.company_name || !job.description || !job.deadline) return res.status(400).json({ success: false, message: 'Title, company name, description, and a valid application deadline are required.' });
  if (job.deadline < new Date().toISOString().slice(0, 10)) return res.status(400).json({ success: false, message: 'Application deadline must be today or a future date.' });
  if (job.salary_min !== null && job.salary_min < 0 || job.salary_max !== null && job.salary_max < 0) {
    return res.status(400).json({ success: false, message: 'Salary amounts cannot be negative.' });
  }
  if (!Number.isInteger(job.vacancies) || job.vacancies < 1) return res.status(400).json({ success: false, message: 'Vacancies must be a whole number of at least 1.' });
  if (job.salary_min !== null && job.salary_max !== null && job.salary_max < job.salary_min) {
    return res.status(400).json({ success: false, message: 'Maximum salary must be greater than or equal to minimum salary.' });
  }
  const requiredSkillsText = job.required_skills.map((skill) => skill.skill_name).join(', ');
  try {
    const requestedStatus = String(req.body.status || 'draft').trim().toLowerCase();
    const isSubmitting = ['pending', 'pending_approval', 'published', 'active', 'scheduled'].includes(requestedStatus);
    const [result] = await db.execute(`UPDATE jobs
      SET title = ?, company_name = ?, description = ?, sector = ?, sub_sectors = ?,
          job_type = ?, experience_level = ?, location = ?, work_address = ?,
          state_province = ?, work_mode = ?, gender_preference = ?, salary_min = ?, salary_max = ?,
          currency = ?, salary_period = ?, is_salary_negotiable = ?, benefits = ?,
          education_qualification = ?, vacancies = ?, deadline = ?, scheduled_date = ?, required_skills = ?,
          status = ?, approval_status = 'pending', is_approved = FALSE,
          approved_by = NULL, approved_at = NULL, is_active = FALSE,
          published_at = NULL,
          closed_at = NULL, rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL
      WHERE id = ? AND employer_id = ?`, [job.title, job.company_name, job.description, job.sector, job.sub_sectors,
      job.job_type, job.experience_level, job.location, job.work_address,
      job.state_province, job.work_mode, job.gender_preference, job.salary_min, job.salary_max,
      job.currency, job.salary_period, job.is_salary_negotiable, job.benefits,
      job.education_qualification, job.vacancies, job.deadline, job.scheduled_date, requiredSkillsText,
      isSubmitting ? 'pending' : 'draft', req.params.jobId, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Job not found.' });
    const [rows] = await db.execute("SELECT *, DATE_FORMAT(scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt FROM jobs WHERE id = ?", [req.params.jobId]);
    return res.json({
      success: true,
      ...rows[0],
      isScheduled: Boolean(rows[0]?.scheduled_date),
    });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to update job.' }); }
};

exports.setJobStatus = async (req, res) => {
  const requestedStatus = String(req.body?.status || 'draft').trim().toLowerCase();
  const role = String(req.user?.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const isSuperAdmin = role === 'super_admin';
  const requestedScheduledAt = req.body?.scheduledAt || req.body?.scheduledDate || req.body?.scheduled_date || null;
  const isScheduling = requestedStatus === 'scheduled'
    || Boolean(requestedScheduledAt && new Date(requestedScheduledAt).getTime() > Date.now());
  const isPublishing = ['published', 'active', 'approved', 'pending_approval'].includes(requestedStatus) || isScheduling;
  try {
    const [[previousJob]] = await db.execute(
      'SELECT status, approval_status, is_approved, approved_by, approved_at, is_active, scheduled_date, published_at FROM jobs WHERE id = ? AND employer_id = ? LIMIT 1',
      [req.params.jobId, req.user.id],
    );
    if (!previousJob) return res.status(404).json({ success: false, message: 'Job not found.' });
    const lifecycleStatus = requestedStatus === 'pending_approval' || isScheduling
      ? 'published'
      : requestedStatus;
    if (!['draft', 'published', 'active', 'paused', 'closed', 'expired'].includes(lifecycleStatus)) {
      return res.status(422).json({ success: false, message: 'Invalid job lifecycle status.' });
    }
    const nextStatus = isPublishing && !isSuperAdmin ? 'pending'
      : isScheduling ? 'published'
        : isPublishing && isSuperAdmin ? 'active' : lifecycleStatus;
    const needsReview = isPublishing && !isSuperAdmin;
    const approvalStatus = needsReview ? 'pending'
      : isPublishing && isSuperAdmin ? 'approved' : previousJob.approval_status || 'pending';
    const isApproved = needsReview ? false
      : isPublishing && isSuperAdmin ? true : Boolean(previousJob.is_approved);
    const isActive = isPublishing && isSuperAdmin ? true
      : isPublishing ? false
      : ['active', 'published'].includes(nextStatus) && approvalStatus === 'approved';
    const approvedBy = needsReview ? null
      : isPublishing && isSuperAdmin ? req.user.id : previousJob.approved_by;
    const approvedAt = needsReview ? null
      : isPublishing && isSuperAdmin ? new Date() : previousJob.approved_at;
    const scheduledDate = isScheduling
      ? requestedScheduledAt || previousJob.scheduled_date || new Date()
      : isPublishing || ['paused', 'closed', 'expired'].includes(nextStatus) ? null : previousJob.scheduled_date;
    const publishedAt = isPublishing && isSuperAdmin && !isScheduling
      ? previousJob.published_at || new Date()
      : isPublishing ? null : lifecycleStatus === 'draft' ? null : previousJob.published_at;
    const [result] = await db.execute(`UPDATE jobs
      SET status = ?, approval_status = ?, is_approved = ?, approved_by = ?, approved_at = ?,
          is_active = ?, scheduled_date = ?, published_at = ?,
          rejection_reason = CASE WHEN ? = TRUE THEN NULL ELSE rejection_reason END,
          reviewed_by = CASE WHEN ? = TRUE THEN NULL ELSE reviewed_by END,
          reviewed_at = CASE WHEN ? = TRUE THEN NULL ELSE reviewed_at END,
          closed_at = CASE WHEN ? = 'closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END,
          updated_at = NOW()
      WHERE id = ? AND employer_id = ?`, [nextStatus, approvalStatus, isApproved, approvedBy, approvedAt,
      isActive, scheduledDate, publishedAt, needsReview, needsReview, needsReview, nextStatus,
      req.params.jobId, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Job not found.' });
    const [rows] = await db.execute('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [req.params.jobId, req.user.id]);
    let telegramNotification = null;
    const wasPubliclyAvailable = String(previousJob.approval_status || '').toLowerCase() === 'approved'
      && ['active', 'published'].includes(String(previousJob.status || '').toLowerCase())
      && [true, 1, '1'].includes(previousJob.is_active);
    if (isPublishing && !wasPubliclyAvailable && rows[0] && isPubliclyEligibleJob(rows[0])) {
      telegramNotification = await dispatchPublishedJobNotifications(rows[0]);
    }
    return res.status(200).json({ success: true, status: rows[0]?.status || nextStatus, approval_status: rows[0]?.approval_status, job: rows[0] || null, telegramNotification, ...(rows[0] || {}) });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to update job status.' }); }
};

exports.publishJobNow = async (req, res) => {
  try {
    const [[job]] = await db.execute(
      `SELECT status, approval_status, deadline,
              (deadline IS NOT NULL AND deadline < CURRENT_DATE) AS deadline_expired
       FROM jobs WHERE id = ? AND employer_id = ? LIMIT 1`,
      [req.params.jobId, req.user.id],
    );
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });

    const status = String(job.status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const approvalStatus = String(job.approval_status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    const canPublish = ['draft', 'pending', 'pending_approval', 'pending_review', 'under_review', 'in_review', 'review'].includes(status);
    if (!canPublish || ['rejected', 'declined'].includes(approvalStatus)) {
      return res.status(409).json({ success: false, message: 'Only draft or pending jobs can be published now.' });
    }
    if ([true, 1, '1'].includes(job.deadline_expired)) {
      return res.status(422).json({ success: false, message: 'This job has an expired application deadline and cannot be published.' });
    }

    const [result] = await db.execute(`UPDATE jobs
      SET status = 'active', approval_status = 'approved', is_approved = TRUE,
          approved_by = ?, approved_at = NOW(), is_active = TRUE,
          scheduled_date = NULL, published_at = COALESCE(published_at, NOW()),
          rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL,
          closed_at = NULL, updated_at = NOW()
      WHERE id = ? AND employer_id = ?
        AND LOWER(REPLACE(REPLACE(status, ' ', '_'), '-', '_')) IN
          ('draft', 'pending', 'pending_approval', 'pending_review', 'under_review', 'in_review', 'review')
        AND LOWER(COALESCE(approval_status, '')) NOT IN ('rejected', 'declined')`,
    [req.user.id, req.params.jobId, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Job not found.' });

    const [[publishedJob]] = await db.execute(
      'SELECT * FROM jobs WHERE id = ? AND employer_id = ?',
      [req.params.jobId, req.user.id],
    );
    return res.status(200).json({
      success: true,
      status: publishedJob.status,
      approval_status: publishedJob.approval_status,
      job: publishedJob,
    });
  } catch (error) {
    console.error('Immediate job publication failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to publish job.' });
  }
};

exports.deleteJob = async (req, res) => {
  try { const [result] = await db.execute('DELETE FROM jobs WHERE id = ? AND employer_id = ?', [req.params.jobId, req.user.id]); return result.affectedRows ? res.json({ success: true }) : res.status(404).json({ success: false, message: 'Job not found.' }); }
  catch (error) { return res.status(500).json({ success: false, message: 'Failed to delete job.' }); }
};

exports.getJobApplicants = async (req, res) => {
  try {
    const [job] = await db.execute('SELECT id, title, status FROM jobs WHERE id = ? AND employer_id = ?', [req.params.jobId, req.user.id]);
    if (!job.length) return res.status(404).json({ success: false, message: 'Job not found.' });
    const [requiredSkillRows] = await db.execute(
      'SELECT skill_name FROM job_required_skills WHERE job_id = ? ORDER BY skill_name ASC',
      [req.params.jobId],
    );
    const searchTerm = String(req.query.search || '').trim();
    const [applicants] = await db.execute(
      `SELECT a.id AS application_id, a.job_id, a.job_seeker_id, a.status,
              a.ai_match_score, a.skills_match_score, a.experience_match_score,
              a.education_match_score, a.location_match_score, a.seeker_cover_letter,
              a.resume_snapshot, a.applied_at, a.employer_notes,
              a.ai_recommendation, a.ai_match_summary, a.ai_strengths, a.ai_missing_skills,
              u.full_name, u.email, u.phone, u.avatar_url,
              jsp.headline, jsp.location AS candidate_location, jsp.skills AS profile_skills,
              jsp.experience_level, jsp.education AS profile_education,
              j.education_qualification AS required_education,
              jsp.education_level, j.title AS job_title,
              c.id AS cv_id, c.file_name, c.file_url, c.ai_extracted_data,
              ca.extracted_skills, ca.extracted_experience, ca.extracted_education,
              i.id AS interview_id, i.scheduled_at AS interview_scheduled_at,
              i.interview_status, i.interview_type, i.interview_url
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.job_seeker_id
       LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
       LEFT JOIN cvs c ON c.id = COALESCE(
         a.cv_id,
         (SELECT cv.id FROM cvs cv WHERE cv.user_id = u.id AND cv.is_primary = TRUE ORDER BY cv.upload_date DESC LIMIT 1)
       )
       LEFT JOIN cv_analysis ca ON ca.cv_id = c.id
       LEFT JOIN interviews i ON i.application_id = a.id
       WHERE a.job_id = ? AND j.employer_id = ?
       ORDER BY a.ai_match_score DESC, a.applied_at DESC`,
      [req.params.jobId, req.user.id],
    );
    const requiredSkills = requiredSkillRows.map((row) => row.skill_name);
    const enrichedApplicants = applicants.map((applicant) => {
      const resumeSnapshot = parseJsonValue(applicant.resume_snapshot, {});
      const extractedData = parseJsonValue(
        applicant.ai_extracted_data,
        resumeSnapshot.extractedData || {},
      );
      const profileSkills = parseJsonValue(applicant.profile_skills, []);
      const cvSkills = parseJsonValue(
        applicant.extracted_skills,
        extractedData.skills || [],
      );
      const candidateSkills = [...new Set(
        [...(Array.isArray(profileSkills) ? profileSkills : []), ...(Array.isArray(cvSkills) ? cvSkills : [])]
          .map((skill) => typeof skill === 'string' ? skill : skill?.skill_name || skill?.name)
          .filter(Boolean),
      )];
      const matchedSkills = requiredSkills.filter((required) =>
        candidateSkills.some((skill) => skill.toLowerCase() === required.toLowerCase()),
      );
      const missingSkills = requiredSkills.filter((required) =>
        !matchedSkills.some((matched) => matched.toLowerCase() === required.toLowerCase()),
      );

      return {
        ...applicant,
        candidateName: applicant.full_name,
        candidateId: applicant.job_seeker_id,
        jobTitle: applicant.job_title,
        candidateLocation: applicant.candidate_location,
        aiMatchScore: applicant.ai_match_score === null ? null : Number(applicant.ai_match_score),
        matchScore: applicant.ai_match_score === null ? null : Number(applicant.ai_match_score),
        matchedSkills,
        candidateSkills,
        requiredSkills,
        missingSkills,
        educationLevel: applicant.education_level || '',
        experienceLevel: applicant.experience_level || '',
        requiredEducation: applicant.required_education || '',
        candidateSummary: applicant.headline || '',
        aiRecommendation: applicant.ai_recommendation || '',
        aiMatchSummary: applicant.ai_match_summary || '',
        experience: parseJsonValue(
          applicant.extracted_experience,
          extractedData.experience || [],
        ),
        education: parseJsonValue(
          applicant.extracted_education,
          extractedData.education || parseJsonValue(applicant.profile_education, []),
        ),
        resumeUrl: applicant.file_url || null,
      };
    });
    const normalizedSearchTerm = searchTerm.toLowerCase();
    const filteredApplicants = normalizedSearchTerm
      ? enrichedApplicants.filter((applicant) => [
          applicant.candidateName,
          applicant.email,
          applicant.jobTitle,
          applicant.candidateSkills.join(' '),
          applicant.matchedSkills.join(' '),
          applicant.missingSkills.join(' '),
        ].some((value) => String(value || '').toLowerCase().includes(normalizedSearchTerm)))
      : enrichedApplicants;
    return res.json({ success: true, job: job[0], applicants: filteredApplicants });
  } catch (error) {
    console.error('Get Employer Job Applicants Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve applicants.' });
  }
};

exports.saveEmployerApplicationNotes = async (req, res) => {
  const applicationId = Number(req.params.applicationId);
  const notes = String(req.body?.notes || '').trim();
  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return res.status(400).json({ success: false, message: 'A valid application id is required.' });
  }
  if (notes.length > 10000) {
    return res.status(400).json({ success: false, message: 'Hiring notes must be 10,000 characters or fewer.' });
  }
  try {
    const [result] = await db.execute(
      `UPDATE applications a
       JOIN jobs j ON j.id = a.job_id
       SET a.employer_notes = ?
       WHERE a.id = ? AND j.employer_id = ?`,
      [notes, applicationId, req.user.id],
    );
    if (!result.affectedRows) {
      const [owned] = await db.execute(
        'SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.employer_id = ? LIMIT 1',
        [applicationId, req.user.id],
      );
      if (!owned.length) return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    return res.json({ success: true, notes });
  } catch (error) {
    console.error('Save Employer Application Notes Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save hiring notes.' });
  }
};

exports.getTopCandidates = async (req, res) => {
  try {
    const [candidates] = await db.execute(`SELECT a.id applicationId, a.job_seeker_id candidateId, u.full_name name, u.email, COALESCE(a.ai_match_score, 0) matchScore, jsp.headline currentTitle, c.file_name cvFileName, a.status FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.job_seeker_id LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id LEFT JOIN cvs c ON c.id = a.cv_id AND c.is_primary = TRUE WHERE a.job_id = ? AND j.employer_id = ? ORDER BY a.ai_match_score DESC, a.applied_at DESC LIMIT ?`, [req.params.jobId, req.user.id, Math.min(Number(req.query.limit) || 5, 50)]);
    return res.json({ success: true, candidates });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to retrieve matched candidates.' }); }
};

exports.getTalentPool = async (req, res) => {
  try {
    const [savedCandidates] = await db.execute(
      `SELECT tp.id, tp.candidateId AS id, u.full_name AS fullName, u.email, u.phone, jsp.headline AS preferredDepartment, jsp.preferred_job_type AS preferredJobType, tp.aiMatchScore, tp.skills, tp.notes, tp.savedAt, c.file_name AS cvFileName FROM talent_pool tp JOIN users u ON u.id = tp.candidateId LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id LEFT JOIN cvs c ON c.user_id = u.id AND c.is_primary = TRUE WHERE tp.employerId = ? ORDER BY tp.savedAt DESC`,
      [req.user.id]
    );

    if (savedCandidates.length) {
      return res.json({ success: true, candidates: savedCandidates.map((candidate) => ({
        ...candidate,
        keySkills: candidate.skills ? JSON.parse(candidate.skills) : [],
        experience: 'Experience TBD',
        aiMatchScore: Number(candidate.aiMatchScore || 0),
      })) });
    }

    const [candidates] = await db.execute(`SELECT DISTINCT u.id, u.full_name fullName, u.email, u.phone, jsp.headline preferredDepartment, jsp.preferred_job_type preferredJobType, c.file_name cvFileName, jsp.profile_completion_percentage FROM users u JOIN job_seeker_profiles jsp ON jsp.user_id = u.id LEFT JOIN cvs c ON c.user_id = u.id AND c.is_primary = TRUE WHERE u.role = 'job_seeker' ORDER BY jsp.profile_completion_percentage DESC, u.created_at DESC`);
    return res.json({ success: true, candidates: candidates.map((candidate) => ({ ...candidate, keySkills: [], experience: 'Experience TBD', aiMatchScore: 0 })) });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to retrieve talent pool.' }); }
};

exports.saveTalentPoolCandidate = async (req, res) => {
  try {
    const candidate = req.body || {};
    const candidateId = Number(candidate.candidateId || candidate.id);
    const candidateName = candidate.candidateName || candidate.fullName || candidate.name || 'Candidate';
    const skills = Array.isArray(candidate.skills) ? candidate.skills : normalizeList(candidate.keySkills || candidate.skills || '');
    const payload = {
      employerId: req.user.id,
      candidateId,
      candidateName,
      primaryRole: candidate.primaryRole || candidate.preferredDepartment || 'General',
      skills: JSON.stringify(skills),
      aiMatchScore: Number(candidate.aiMatchScore ?? candidate.matchScore ?? 0),
      notes: candidate.notes || '',
    };

    if (!candidateId) {
      return res.status(400).json({ success: false, message: 'Candidate is required.' });
    }

    await db.execute(
      `INSERT INTO talent_pool (employerId, candidateId, candidateName, primaryRole, skills, aiMatchScore, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE candidateName = VALUES(candidateName), primaryRole = VALUES(primaryRole), skills = VALUES(skills), aiMatchScore = VALUES(aiMatchScore), notes = VALUES(notes)`,
      [payload.employerId, payload.candidateId, payload.candidateName, payload.primaryRole, payload.skills, payload.aiMatchScore, payload.notes]
    );

    return res.json({ success: true, message: 'Candidate saved to talent pool.' });
  } catch (error) {
    console.error('Save Talent Pool Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save talent pool candidate.' });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  const validStatuses = ['pending', 'review', 'shortlisted', 'interviewed', 'hired', 'rejected'];
  const requestedStatus = normalizeApplicationStatus(req.body.status);
  const employerNotes = String(req.body?.employer_notes || '').trim();

  if (!validStatuses.includes(requestedStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid application status. Use one of: Pending, Review, Shortlisted, Interview, Hired, Rejected.',
    });
  }
  if (requestedStatus === 'interviewed') {
    return res.status(400).json({
      success: false,
      message: 'Schedule an interview with a date and time before setting this status.',
    });
  }
  if (employerNotes.length > 2000) {
    return res.status(400).json({ success: false, message: 'Feedback must be 2,000 characters or fewer.' });
  }

  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [applicationRows] = await connection.execute(
      `SELECT a.status, a.job_id AS jobId, a.job_seeker_id AS candidateId,
              j.title AS jobTitle,
              COALESCE(
                NULLIF(j.company_name, ''),
                (SELECT NULLIF(cp.company_name, '') FROM company_profiles cp WHERE cp.employer_id = j.employer_id LIMIT 1),
                (SELECT NULLIF(ep.company_name, '') FROM employers ep WHERE ep.user_id = j.employer_id OR ep.userId = j.employer_id LIMIT 1),
                employer.full_name,
                'the company'
              ) AS companyName,
              employer.full_name AS employerName, seeker.full_name AS candidateName,
              seeker.phone AS candidatePhone, seeker.email AS candidateEmail
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users employer ON employer.id = j.employer_id
       JOIN users seeker ON seeker.id = a.job_seeker_id
       WHERE a.id = ? AND j.employer_id = ?
       FOR UPDATE`,
      [req.params.applicationId, req.user.id],
    );
    const application = applicationRows[0];
    if (!application) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    await connection.execute(
      'UPDATE applications SET status = ?, employer_notes = COALESCE(?, employer_notes) WHERE id = ?',
      [requestedStatus, employerNotes || null, req.params.applicationId],
    );
    const statusChanged = normalizeApplicationStatus(application.status) !== requestedStatus;
    if (statusChanged || employerNotes) {
      const companyName = application.companyName || application.employerName || 'the company';
      const statusLabel = requestedStatus.charAt(0).toUpperCase() + requestedStatus.slice(1);
      await connection.execute(
        `INSERT INTO application_timeline_events (application_id, stage_name, status_note)
         VALUES (?, ?, ?)`,
        [req.params.applicationId, statusLabel, employerNotes || `Application status changed to ${statusLabel}.`],
      );
      const statusMessage = requestedStatus === 'shortlisted'
        ? `Your application for ${application.jobTitle} has been Shortlisted!`
        : requestedStatus === 'hired'
          ? `Congratulations! You have been marked as Hired at ${companyName}`
          : `Your application for ${application.jobTitle} has been ${statusLabel}.`;
      const message = employerNotes
        ? `${statusMessage} Feedback: ${employerNotes}`
        : statusMessage;
      await createNotification({
        executor: connection,
        userId: application.candidateId,
        type: requestedStatus === 'hired' ? 'HIRING' : requestedStatus === 'shortlisted' ? 'SHORTLIST' : requestedStatus === 'interviewed' ? 'INTERVIEW' : 'APPLICATION',
        title: `Application update: ${statusLabel}`,
        message,
        referenceType: 'APPLICATION_STATUS',
        referenceId: req.params.applicationId,
        jobId: application.jobId,
        applicationId: req.params.applicationId,
        relatedUserId: req.user.id,
      });
    }

    await connection.commit();
    transactionStarted = false;
    if (statusChanged && requestedStatus === 'shortlisted') {
      await sendCandidateSmsAlert({
        applicationId: req.params.applicationId,
        employerId: req.user.id,
        message: `Your application for ${application.jobTitle} has been shortlisted by ${application.companyName || application.employerName || 'the employer'}.`,
      });
    }
    if (
      statusChanged
      && ['shortlisted', 'interviewed'].includes(requestedStatus)
    ) {
      await dispatchApplicationStatusWebhook({
        event: 'application.status_changed',
        applicationId: Number(req.params.applicationId),
        candidateId: application.candidateId,
        candidatePhone: application.candidatePhone,
        candidateEmail: application.candidateEmail,
        jobId: application.jobId,
        jobTitle: application.jobTitle,
        companyName: application.companyName || application.employerName,
        status: requestedStatus === 'interviewed' ? 'interview' : requestedStatus,
        occurredAt: new Date().toISOString(),
      });
    }
    let telegramNotification = { sent: false, message: 'No application status change was sent to Telegram.' };
    if (statusChanged) {
      try {
        const fallbackChatId = process.env.TELEGRAM_CHAT_ID || '6707730892';
        const telegramResult = await notifyCandidateStatusUpdate(application.candidateId, {
          applicationId: Number(req.params.applicationId),
          candidateName: application.candidateName,
          jobTitle: application.jobTitle,
          company: application.companyName || application.employerName,
          newStatus: requestedStatus === 'interviewed' ? 'Interview' : requestedStatus,
        }, fallbackChatId);
        telegramNotification = {
          sent: Boolean(telegramResult?.delivered),
          message: telegramResult?.delivered
            ? telegramResult?.fallback
              ? 'Status updated; notification sent to the configured admin chat.'
              : 'Status update sent on Telegram.'
            : 'Telegram status update was not delivered.',
        };
      } catch (telegramError) {
        console.error('Telegram application status alert failed:', telegramError.message);
        telegramNotification = { sent: false, message: 'Status updated, but the Telegram alert could not be delivered.' };
      }
    }
    return res.json({ success: true, status: requestedStatus, telegramSent: telegramNotification.sent, telegramNotification });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error('Update Application Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update application.' });
  } finally {
    connection.release();
  }
};

const normalizePipelineCounts = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value) || 0;
};

exports.getEmployerPipeline = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const [applications] = await db.execute(
      'SELECT * FROM applications WHERE employer_id = ?',
      [req.user.id],
    );
    if (!applications.length) {
      return res.json({ success: true, applications: [] });
    }

    const applicationIds = applications.map((application) => application.id);
    const [rows] = await db.execute(
      `SELECT a.id, a.job_id AS jobId, a.job_seeker_id AS candidateId, a.status, a.ai_match_score AS aiScore, a.applied_at AS appliedAt,
              u.full_name AS name, u.email, u.phone,
              j.title AS jobTitle,
              c.file_url AS resumeUrl,
              NULL AS coverLetter
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.job_seeker_id
       LEFT JOIN cvs c ON c.user_id = u.id AND c.is_primary = TRUE
       WHERE a.employer_id = ? AND a.id IN (${applicationIds.map(() => '?').join(', ')})
       ORDER BY a.applied_at DESC`,
      [req.user.id, ...applicationIds]
    );

    const pipeline = await Promise.all(rows.map(async (row) => {
      const [matchedSkillsRaw] = await db.execute('SELECT skills FROM job_seeker_profiles WHERE user_id = ? LIMIT 1', [row.candidateId]);
      const [requiredSkillsRaw] = await db.execute('SELECT skill_name FROM job_required_skills WHERE job_id = ? ORDER BY skill_name ASC', [row.jobId]);
      let savedSkills = [];
      try { savedSkills = Array.isArray(matchedSkillsRaw[0]?.skills) ? matchedSkillsRaw[0].skills : JSON.parse(matchedSkillsRaw[0]?.skills || '[]'); } catch { savedSkills = []; }
      const matched = [...new Set(savedSkills.map((item) => typeof item === 'string' ? item : item?.skill_name || item?.name).filter(Boolean))].filter((skill) => requiredSkillsRaw.some((required) => required.skill_name === skill));
      const missing = [...new Set(requiredSkillsRaw.map((item) => item.skill_name))].filter((skill) => !matched.includes(skill));
      return {
        ...row,
        aiMatchScore: Number(row.aiScore || 0),
        matchScore: Number(row.aiScore || 0),
        appliedAt: row.appliedAt || new Date().toISOString(),
        matchedSkills: matched,
        missingSkills: missing,
        status: row.status || 'applied',
      };
    }));

    return res.json({ success: true, applications: pipeline });
  } catch (error) {
    console.error('Employer Pipeline Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pipeline data.' });
  }
};

exports.getJobInvitations = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ji.*, u.full_name AS candidateName, j.title AS jobTitle
       FROM job_invitations ji
       JOIN users u ON u.id = ji.candidateId
       JOIN jobs j ON j.id = ji.jobId
       WHERE ji.employerId = ?
       ORDER BY ji.sentAt DESC`,
      [req.user.id]
    );
    return res.json({ success: true, invitations: rows });
  } catch (error) {
    console.error('Get Job Invitations Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch job invitations.' });
  }
};

exports.createJobInvitation = async (req, res) => {
  try {
    const payload = req.body || {};
    const candidateId = Number(payload.candidateId || payload.candidate_id || payload.userId);
    const jobId = Number(payload.jobId || payload.job_id);
    const message = String(payload.message || '').trim();

    if (!candidateId || !jobId) {
      return res.status(400).json({ success: false, message: 'Candidate and job are required.' });
    }

    const [job] = await db.execute('SELECT id FROM jobs WHERE id = ? AND employer_id = ?', [jobId, req.user.id]);
    if (!job.length) {
      return res.status(404).json({ success: false, message: 'Published job not found.' });
    }

    const [result] = await db.execute(
      `INSERT INTO job_invitations (employerId, candidateId, jobId, message, status, sentAt)
       VALUES (?, ?, ?, ?, 'invited', NOW())
       ON DUPLICATE KEY UPDATE message = VALUES(message), status = 'invited', sentAt = NOW()`,
      [req.user.id, candidateId, jobId, message || 'You have been invited to apply for a new role.']
    );

    return res.status(201).json({ success: true, id: result.insertId || jobId, message: 'Invitation sent successfully.' });
  } catch (error) {
    console.error('Create Job Invitation Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send invitation.' });
  }
};

exports.getEmployerOffers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT o.*, a.id AS applicationId, u.full_name AS candidateName, j.title AS jobTitle
       FROM offers o
       JOIN applications a ON a.id = o.applicationId
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.job_seeker_id
       WHERE o.employerId = ?
       ORDER BY o.sentAt DESC`,
      [req.user.id]
    );
    return res.json({ success: true, offers: rows });
  } catch (error) {
    console.error('Employer Offers Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load offers.' });
  }
};

exports.createEmployerOffer = async (req, res) => {
  try {
    const payload = req.body || {};
    const applicationId = Number(payload.applicationId || payload.id);
    if (!applicationId) return res.status(400).json({ success: false, message: 'Application is required.' });

    const [owned] = await db.execute(
      'SELECT a.id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.employer_id = ?',
      [applicationId, req.user.id]
    );
    if (!owned.length) return res.status(404).json({ success: false, message: 'Application not found.' });

    const [result] = await db.execute(
      `INSERT INTO offers (applicationId, employerId, candidateId, offeredSalary, startDate, offerLetterUrl, status, sentAt)
       VALUES (?, ?, ?, ?, ?, ?, 'sent', NOW())
       ON DUPLICATE KEY UPDATE offeredSalary = VALUES(offeredSalary), startDate = VALUES(startDate), offerLetterUrl = VALUES(offerLetterUrl), status = VALUES(status), sentAt = NOW()`,
      [
        applicationId,
        req.user.id,
        payload.candidateId || payload.candidate_id || null,
        payload.offeredSalary || payload.salary || null,
        payload.startDate || payload.start_date || null,
        payload.offerLetterUrl || payload.offerLetter || null,
      ]
    );

    return res.status(201).json({ success: true, id: result.insertId || applicationId, offer: payload });
  } catch (error) {
    console.error('Create Employer Offer Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create offer.' });
  }
};

exports.getEmployerOnboarding = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ot.*, u.full_name AS candidateName, j.title AS jobTitle,
              (SELECT COUNT(*) FROM onboarding_tasks ot2 WHERE ot2.candidateId = ot.candidateId AND ot2.employerId = ? AND ot2.isCompleted = TRUE) AS completedCount
       FROM onboarding_tasks ot
       JOIN users u ON u.id = ot.candidateId
       JOIN applications a ON a.job_seeker_id = ot.candidateId
       JOIN jobs j ON j.id = a.job_id
       WHERE ot.employerId = ?
       GROUP BY ot.id
       ORDER BY ot.updatedAt DESC`,
      [req.user.id, req.user.id]
    );
    return res.json({ success: true, onboarding: rows });
  } catch (error) {
    console.error('Employer Onboarding Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load onboarding tasks.' });
  }
};

exports.updateEmployerOnboardingTask = async (req, res) => {
  try {
    const payload = req.body || {};
    const taskId = Number(req.params.taskId);
    if (!taskId) return res.status(400).json({ success: false, message: 'Task is required.' });

    await db.execute(
      `UPDATE onboarding_tasks SET isCompleted = ?, documentUrl = ?, updatedAt = NOW() WHERE id = ? AND employerId = ?`,
      [payload.isCompleted !== undefined ? Boolean(payload.isCompleted) : true, payload.documentUrl || null, taskId, req.user.id]
    );

    return res.json({ success: true, message: 'Task updated.' });
  } catch (error) {
    console.error('Update Employer Onboarding Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update onboarding task.' });
  }
};

exports.finalizeEmployerEmployee = async (req, res) => {
  try {
    const applicationId = Number(req.params.applicationId);
    const [application] = await db.execute(
      'SELECT a.id, a.job_seeker_id AS candidateId FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ? AND j.employer_id = ?',
      [applicationId, req.user.id]
    );
    if (!application.length) return res.status(404).json({ success: false, message: 'Application not found.' });

    await db.execute('UPDATE applications SET status = ' + "'hired'" + ' WHERE id = ?', [applicationId]);
    await db.execute(
      `INSERT INTO application_timeline_events (application_id, stage_name, status_note)
       VALUES (?, 'Hired', 'Candidate hired by the employer.')`,
      [applicationId],
    );
    await db.execute(
      `INSERT INTO onboarding_tasks (candidateId, employerId, taskTitle, isCompleted, documentUrl, updatedAt)
       VALUES (?, ?, 'Onboarding Finalized', TRUE, NULL, NOW())
       ON DUPLICATE KEY UPDATE isCompleted = TRUE, updatedAt = NOW()`,
      [application[0].candidateId, req.user.id]
    );

    return res.json({ success: true, message: 'Candidate finalized as active employee.' });
  } catch (error) {
    console.error('Finalize Employer Employee Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to finalize candidate.' });
  }
};

exports.scheduleInterview = async (req, res) => {
  const { applicationId, application_id, scheduledDate, scheduledTime, scheduled_at, interviewType, interview_type, meetingLink, interview_url, duration_minutes, notes } = req.body;
  const targetApplication = applicationId || application_id;
  const scheduledAt = scheduledDate && scheduledTime
    ? `${scheduledDate} ${scheduledTime}:00`
    : String(scheduled_at || '').replace('T', ' ').replace(/Z$/, '');
  const parsedSchedule = scheduledAt ? new Date(scheduledAt.replace(' ', 'T')) : null;
  if (!targetApplication || !scheduledAt || Number.isNaN(parsedSchedule?.getTime())) {
    return res.status(400).json({ success: false, message: 'A valid application, date, and time are required.' });
  }
  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const [owned] = await connection.execute(
      `SELECT a.id, a.job_id AS jobId, a.job_seeker_id AS candidateId,
              candidate.phone AS candidatePhone, candidate.email AS candidateEmail,
              candidate.telegram_chat_id AS candidateChatId,
              candidate.is_telegram_alerts_active AS candidateTelegramAlertsActive,
              candidate.full_name AS candidateName,
              j.title AS jobTitle,
              COALESCE(
                NULLIF(j.company_name, ''),
                (SELECT NULLIF(cp.company_name, '') FROM company_profiles cp WHERE cp.employer_id = j.employer_id LIMIT 1),
                (SELECT NULLIF(ep.company_name, '') FROM employers ep WHERE ep.user_id = j.employer_id OR ep.userId = j.employer_id LIMIT 1),
                employer.full_name,
                'the company'
              ) AS companyName,
              employer.full_name AS employerName
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users employer ON employer.id = j.employer_id
       JOIN users candidate ON candidate.id = a.job_seeker_id
       WHERE a.id = ? AND j.employer_id = ?
       FOR UPDATE`,
      [targetApplication, req.user.id],
    );
    if (!owned.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    await connection.execute(
      `INSERT INTO interviews
        (application_id, interview_type, scheduled_at, duration_minutes, interview_url, interview_status, interviewer_id, notes)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)
       ON DUPLICATE KEY UPDATE interview_type = VALUES(interview_type),
         scheduled_at = VALUES(scheduled_at), duration_minutes = VALUES(duration_minutes),
         interview_url = VALUES(interview_url), interview_status = 'scheduled',
         candidate_response = 'pending', notes = VALUES(notes)`,
      [targetApplication, interview_type || interviewType || 'video', scheduledAt, duration_minutes || 60, interview_url || meetingLink || null, req.user.id, notes || null],
    );
    await connection.execute("UPDATE applications SET status = 'interview' WHERE id = ?", [targetApplication]);
    await connection.execute(
      `INSERT INTO application_timeline_events (application_id, stage_name, status_note)
       VALUES (?, 'Interview', ?)`,
      [targetApplication, `Interview scheduled for ${scheduledAt}.`],
    );
    const dateLabel = new Date(
      `${scheduledDate || scheduledAt.slice(0, 10)}T${scheduledTime || scheduledAt.slice(11, 16)}`,
    ).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const companyName = owned[0].companyName || owned[0].employerName || 'the company';
    await createNotification({
      executor: connection,
      userId: owned[0].candidateId,
      type: 'INTERVIEW',
      title: 'Interview Invitation',
      message: `Interview Invitation from ${companyName} for ${owned[0].jobTitle} on ${dateLabel}`,
      referenceType: 'APPLICATION_STATUS',
      referenceId: targetApplication,
      jobId: owned[0].jobId,
      applicationId: targetApplication,
      relatedUserId: req.user.id,
    });
    await connection.commit();
    transactionStarted = false;
    const interviewLink = interview_url || meetingLink;
    const interviewSms = `Interview invitation: ${owned[0].jobTitle} at ${companyName}, ${dateLabel}${interviewLink ? ` ${interviewLink}` : ''}`;
    await sendCandidateSmsAlert({
      applicationId: targetApplication,
      employerId: req.user.id,
      message: interviewSms,
    });
    await dispatchApplicationStatusWebhook({
      event: 'application.status_changed',
      applicationId: Number(targetApplication),
      candidateId: owned[0].candidateId,
      candidatePhone: owned[0].candidatePhone,
      candidateEmail: owned[0].candidateEmail,
      jobId: owned[0].jobId,
      jobTitle: owned[0].jobTitle,
      companyName,
      status: 'interview',
      scheduledAt,
      interviewType: interview_type || interviewType || 'video',
      meetingUrl: interview_url || meetingLink || null,
      occurredAt: new Date().toISOString(),
    });
    let telegramNotification = { sent: false, message: 'Candidate has no active linked Telegram chat.' };
    if (owned[0].candidateChatId && owned[0].candidateTelegramAlertsActive) {
      try {
        await notifyCandidateInterviewScheduled(owned[0].candidateChatId, {
          applicationId: Number(targetApplication),
          candidateName: owned[0].candidateName,
          jobTitle: owned[0].jobTitle,
          company: companyName,
          interviewDate: dateLabel,
          interviewType: interview_type || interviewType || 'video',
        });
        telegramNotification = { sent: true, message: 'Interview invitation sent to the candidate on Telegram.' };
      } catch (telegramError) {
        console.error('Telegram interview alert failed:', telegramError.message);
        telegramNotification = { sent: false, message: 'Interview scheduled, but the Telegram alert could not be delivered.' };
      }
    }
    return res.json({ success: true, message: 'Interview scheduled.', telegramNotification });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error('Schedule Interview Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to schedule interview.' });
  } finally {
    connection.release();
  }
};

exports.getUpcomingInterviews = async (req, res) => {
  try { const [interviews] = await db.execute(`SELECT i.*, u.full_name candidate_name, u.email candidate_email, j.title job_title FROM interviews i JOIN applications a ON a.id = i.application_id JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.job_seeker_id WHERE j.employer_id = ? ORDER BY i.scheduled_at ASC`, [req.user.id]); return res.json({ success: true, interviews }); }
  catch (error) { return res.status(500).json({ success: false, message: 'Failed to retrieve interviews.' }); }
};

exports.getEmployerMessages = async (req, res) => {
  const conversationId = Number(req.query.conversationId || 0);
  try {
    const [conversations] = await db.execute(
      `SELECT c.id, c.job_seeker_id AS candidateId, u.full_name AS candidateName,
              u.email AS candidateEmail, j.title AS jobTitle, c.last_message_at AS lastMessageAt,
              COALESCE(a.status, 'under-review') AS stage,
              (SELECT m.message_text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS lastMessage,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.is_read = FALSE) AS unreadCount
       FROM conversations c
       JOIN users u ON u.id = c.job_seeker_id
       LEFT JOIN jobs j ON j.id = c.job_id
       LEFT JOIN applications a ON a.job_id = c.job_id AND a.job_seeker_id = c.job_seeker_id
       WHERE c.employer_id = ?
       ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC`,
      [req.user.id, req.user.id]
    );

    if (!conversationId) return res.json({ success: true, conversations, messages: [] });
    const [messages] = await db.execute(
      `SELECT m.id, m.conversation_id AS conversationId, m.sender_id AS senderId,
              m.message_text AS text, m.is_read AS isRead, m.created_at AS createdAt,
              u.full_name AS senderName
       FROM messages m JOIN users u ON u.id = m.sender_id
       JOIN conversations c ON c.id = m.conversation_id
       WHERE m.conversation_id = ? AND c.employer_id = ?
       ORDER BY m.created_at ASC`,
      [conversationId, req.user.id]
    );
    await db.execute('UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE conversation_id = ? AND sender_id <> ?', [conversationId, req.user.id]);
    return res.json({ success: true, conversations, messages });
  } catch (error) {
    console.error('Employer Messages Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load messages.' });
  }
};

exports.sendEmployerMessage = async (req, res) => {
  try {
    const payload = req.body || {};
    const candidateId = Number(payload.candidateId || payload.recipientId || 0);
    const body = String(payload.body || payload.message || '').trim();
    const requestedConversationId = Number(payload.conversationId || 0);
    if ((!candidateId && !requestedConversationId) || !body) {
      return res.status(400).json({ success: false, message: 'Candidate and message content are required.' });
    }
    let conversationId = requestedConversationId;
    if (conversationId) {
      const [owned] = await db.execute('SELECT id FROM conversations WHERE id = ? AND employer_id = ?', [conversationId, req.user.id]);
      if (!owned.length) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    } else {
      const [relationship] = await db.execute(
        `SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.employer_id = ? AND a.job_seeker_id = ?
         UNION SELECT 1 FROM job_invitations WHERE employerId = ? AND candidateId = ? LIMIT 1`,
        [req.user.id, candidateId, req.user.id, candidateId]
      );
      if (!relationship.length) return res.status(403).json({ success: false, message: 'A valid application or invitation is required to start a conversation.' });
      const [existing] = await db.execute('SELECT id FROM conversations WHERE employer_id = ? AND job_seeker_id = ? ORDER BY updated_at DESC LIMIT 1', [req.user.id, candidateId]);
      if (existing.length) conversationId = existing[0].id;
      else {
        const [created] = await db.execute('INSERT INTO conversations (employer_id, job_seeker_id, status) VALUES (?, ?, \'active\')', [req.user.id, candidateId]);
        conversationId = created.insertId;
      }
    }
    const [[conversation]] = await db.execute(
      `SELECT c.id, c.job_seeker_id AS candidateId, candidate.telegram_chat_id AS candidateChatId,
              candidate.full_name AS candidateName, j.title AS jobTitle,
              COALESCE(NULLIF(j.company_name, ''), NULLIF(cp.company_name, ''), employer.full_name, 'Employer') AS companyName
       FROM conversations c
       JOIN users candidate ON candidate.id = c.job_seeker_id
       JOIN users employer ON employer.id = c.employer_id
       LEFT JOIN jobs j ON j.id = c.job_id
       LEFT JOIN company_profiles cp ON cp.employer_id = employer.id
       WHERE c.id = ? AND c.employer_id = ?`,
      [conversationId, req.user.id],
    );
    const [result] = await db.execute('INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, is_read) VALUES (?, ?, ?, ?, FALSE)', [conversationId, req.user.id, conversation.candidateId, body]);
    await db.execute('UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?', [conversationId]);
    await createNotification({ userId: conversation.candidateId, type: 'MESSAGE', title: 'New Message', message: `You received a new message from ${conversation.companyName}.`, referenceType: 'MESSAGE', referenceId: result.insertId, relatedUserId: req.user.id });
    if (conversation.candidateChatId) {
      try {
        await notifyCandidateNewMessage(conversation.candidateChatId, {
          company: conversation.companyName,
          threadId: conversationId,
          messageId: result.insertId,
        });
      } catch (telegramError) {
        console.error('Telegram candidate message alert failed:', telegramError.message);
      }
    }
    return res.status(201).json({ success: true, messageId: result.insertId, conversationId });
  } catch (error) {
    console.error('Send Employer Message Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

exports.getEmployerConversations = async (req, res) => {
  try {
    const [rows] = await db.execute(
            `SELECT c.id AS conversationId, c.employer_id AS employerId, c.job_seeker_id AS candidateId, u.full_name AS candidateName,
              COALESCE(u.profile_picture_url, u.avatar_url) AS candidatePhoto, j.title AS jobTitle,
              (SELECT m.message_text FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS lastMessage,
              COALESCE(c.last_message_at, c.updated_at, c.created_at) AS lastMessageTime,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.receiver_id = ? AND m.is_read = FALSE) AS unreadCount
       FROM conversations c
       JOIN users u ON u.id = c.job_seeker_id
       LEFT JOIN jobs j ON j.id = c.job_id
       WHERE c.employer_id = ? AND c.status <> 'archived'
       ORDER BY lastMessageTime DESC`,
      [req.user.id, req.user.id]
    );
    return res.json({ success: true, data: rows, conversations: rows });
  } catch (error) {
    console.error('Employer Conversations Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load conversations.' });
  }
};

exports.getEmployerConversation = async (req, res) => {
  try {
    const [[conversation]] = await db.execute(
            `SELECT c.id AS conversationId, c.employer_id AS employerId, c.job_seeker_id AS candidateId, u.full_name AS candidateName,
              u.email AS candidateEmail, COALESCE(u.profile_picture_url, u.avatar_url) AS candidatePhoto, j.title AS jobTitle,
              COALESCE(a.status, 'active') AS candidateStatus
       FROM conversations c JOIN users u ON u.id = c.job_seeker_id
       LEFT JOIN jobs j ON j.id = c.job_id
       LEFT JOIN applications a ON a.job_id = c.job_id AND a.job_seeker_id = c.job_seeker_id
       WHERE c.id = ? AND c.employer_id = ? LIMIT 1`,
      [req.params.conversationId, req.user.id]
    );
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    const [messages] = await db.execute(
      `SELECT m.id, m.conversation_id AS conversationId, m.sender_id AS senderId, m.receiver_id AS receiverId,
              m.message_text AS message, m.is_read AS isRead, m.read_at AS readAt, m.created_at AS createdAt
       FROM messages m WHERE m.conversation_id = ? ORDER BY m.created_at ASC`,
      [req.params.conversationId]
    );
    await db.execute('UPDATE messages SET is_read = TRUE, read_at = NOW() WHERE conversation_id = ? AND receiver_id = ?', [req.params.conversationId, req.user.id]);
    return res.json({ success: true, data: { conversation, messages } });
  } catch (error) {
    console.error('Employer Conversation Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load conversation.' });
  }
};

exports.sendConversationMessage = async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ success: false, message: 'Please enter a message.' });
    if (message.length > 5000) return res.status(400).json({ success: false, message: 'Message is too large.' });
    const [[conversation]] = await db.execute(
      `SELECT c.id, c.job_seeker_id AS candidateId, candidate.telegram_chat_id AS candidateChatId,
              candidate.full_name AS candidateName, j.title AS jobTitle,
              COALESCE(NULLIF(j.company_name, ''), NULLIF(cp.company_name, ''), employer.full_name, 'Employer') AS companyName
       FROM conversations c
       JOIN users candidate ON candidate.id = c.job_seeker_id
       JOIN users employer ON employer.id = c.employer_id
       LEFT JOIN jobs j ON j.id = c.job_id
       LEFT JOIN company_profiles cp ON cp.employer_id = employer.id
       WHERE c.id = ? AND c.employer_id = ? AND c.status <> 'archived'`,
      [req.params.conversationId, req.user.id],
    );
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    const [result] = await db.execute('INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, is_read) VALUES (?, ?, ?, ?, FALSE)', [conversation.id, req.user.id, conversation.candidateId, message]);
    await db.execute('UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ? AND employer_id = ?', [conversation.id, req.user.id]);
    await createNotification({ userId: conversation.candidateId, type: 'MESSAGE', title: 'New Message', message: `You received a new message from ${conversation.companyName}.`, referenceType: 'MESSAGE', referenceId: result.insertId, relatedUserId: req.user.id });
    if (conversation.candidateChatId) {
      try {
        await notifyCandidateNewMessage(conversation.candidateChatId, {
          company: conversation.companyName,
          threadId: conversation.id,
          messageId: result.insertId,
        });
      } catch (telegramError) {
        console.error('Telegram candidate message alert failed:', telegramError.message);
      }
    }
    const [[saved]] = await db.execute('SELECT id, conversation_id AS conversationId, sender_id AS senderId, receiver_id AS receiverId, message_text AS message, is_read AS isRead, created_at AS createdAt FROM messages WHERE id = ?', [result.insertId]);
    return res.status(201).json({ success: true, data: saved, message: saved });
  } catch (error) {
    console.error('Send Conversation Message Error:', error);
    return res.status(500).json({ success: false, message: 'Message could not be sent.' });
  }
};

exports.markEmployerConversationRead = async (req, res) => {
  try {
    const [result] = await db.execute('UPDATE messages m JOIN conversations c ON c.id = m.conversation_id SET m.is_read = TRUE, m.read_at = NOW() WHERE m.conversation_id = ? AND c.employer_id = ? AND m.receiver_id = ?', [req.params.conversationId, req.user.id, req.user.id]);
    if (!result.affectedRows) return res.status(200).json({ success: true, data: { marked: 0 } });
    return res.json({ success: true, data: { marked: result.affectedRows } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to mark conversation as read.' });
  }
};

exports.getEmployerUnreadMessageCount = async (req, res) => {
  try {
    const [[row]] = await db.execute('SELECT COUNT(*) AS count FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.employer_id = ? AND m.receiver_id = ? AND m.is_read = FALSE', [req.user.id, req.user.id]);
    return res.json({ success: true, data: { count: Number(row?.count || 0) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load unread message count.' });
  }
};

exports.deleteEmployerConversation = async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM conversations WHERE id = ? AND employer_id = ?', [req.params.conversationId, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to delete conversation.' });
  }
};

exports.getEmployerNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const [rows] = await db.execute(
      `SELECT id, type, title, message, reference_type AS referenceType, reference_id AS referenceId,
              related_job_id AS jobId, related_application_id AS applicationId, is_read AS isRead,
              related_user_id AS senderId,
              created_at AS createdAt, read_at AS readAt
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]);
    return res.json({ success: true, data: rows, notifications: rows, unreadCount: Number(countRows[0]?.count || 0) });
  } catch (error) {
    console.error('Employer Notifications Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
};

exports.markEmployerNotificationRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const [result] = await db.execute('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Notification not found.' });
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark Employer Notification Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
};

exports.getEmployerUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const [rows] = await db.execute('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE', [userId]);
    return res.json({ success: true, data: { count: Number(rows[0]?.count || 0) } });
  } catch (error) {
    console.error('Employer Notification Count Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notification count.' });
  }
};

exports.markAllEmployerNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    await db.execute('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE', [userId]);
    return res.json({ success: true, data: { count: 0 } });
  } catch (error) {
    console.error('Mark All Employer Notifications Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
  }
};

exports.deleteEmployerNotification = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const [result] = await db.execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Notification not found.' });
    return res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    console.error('Delete Employer Notification Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
};

exports.deleteReadEmployerNotifications = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const [result] = await db.execute('DELETE FROM notifications WHERE user_id = ? AND is_read = TRUE', [userId]);
    return res.json({ success: true, deletedCount: Number(result.affectedRows || 0) });
  } catch (error) {
    console.error('Delete Read Employer Notifications Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete read notifications.' });
  }
};

exports.getEmployerSettings = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const [[settingsRows], [companyRows]] = await Promise.all([
      db.execute('SELECT * FROM employer_settings WHERE userId = ? LIMIT 1', [userId]),
      db.execute(
        `SELECT cp.company_name, cp.industry, cp.location, cp.website, cp.description, cp.company_summary, cp.logo_url,
                cp.employer_type, cp.tin_number, cp.company_registration_number, cp.verification_status,
                cp.trade_license_url, cp.trade_license_name,
                e.company_name AS employer_company_name, e.legalBusinessName AS legal_business_name,
                e.industry AS employer_industry,
                e.headquarters_location, e.about_company, e.logo_url AS employer_logo_url
         FROM employers e
         LEFT JOIN company_profiles cp ON cp.employer_id = ?
         WHERE e.user_id = ? OR e.userId = ?
         LIMIT 1`,
        [userId, userId, userId]
      ),
    ]);
    const row = settingsRows[0] || {};
    const company = companyRows[0] || {};
    const [ownerRows] = await db.execute('SELECT full_name, email FROM users WHERE id = ? LIMIT 1', [userId]);
    let workspacePreferences = row.workspacePreferences || {};
    if (typeof workspacePreferences === 'string') {
      try {
        workspacePreferences = JSON.parse(workspacePreferences);
      } catch (parseError) {
        console.error('Employer workspace preferences contain invalid JSON:', parseError);
        workspacePreferences = {};
      }
    }
    return res.json({
      success: true,
      settings: {
        userId,
        emailAlerts: row.emailAlerts ?? true,
        matchingAlerts: row.matchingAlerts ?? true,
        weeklyDigest: row.weeklyDigest ?? false,
        notificationEmail: row.notificationEmail || '',
        ...workspacePreferences,
        company: {
          ...(workspacePreferences.company || {}),
          legalName: company.legal_business_name || workspacePreferences.company?.legalName || company.company_name || company.employer_company_name || '',
          tradeBrandName: workspacePreferences.company?.tradeBrandName || company.company_name || company.employer_company_name || '',
          companyName: company.company_name || company.employer_company_name || '',
          companyType: workspacePreferences.company?.companyType || 'Startup',
          tinNumber: company.tin_number || workspacePreferences.company?.tinNumber || '',
          registrationNumber: company.company_registration_number || workspacePreferences.company?.registrationNumber || '',
          industry: company.industry || company.employer_industry || '',
          location: company.location || company.headquarters_location || '',
          website: company.website || '',
          bio: company.description || company.company_summary || company.about_company || '',
          logo: company.logo_url || company.employer_logo_url || '',
          verificationStatus: company.verification_status || 'pending',
          tradeLicenseUrl: company.trade_license_url || '',
          tradeLicenseName: company.trade_license_name || '',
        },
        team: {
          activeMembers: [{
            name: ownerRows[0]?.full_name || 'Workspace owner',
            email: ownerRows[0]?.email || '',
            role: 'Admin',
            status: 'active',
          }],
          pendingInvites: workspacePreferences.team?.pendingInvites || [],
          seatLimit: 5,
        },
      },
    });
  } catch (error) {
    console.error('Employer Settings Fetch Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
};

exports.updateEmployerSettings = async (req, res) => {
  let connection;
  let transactionStarted = false;
  try {
    connection = await db.getConnection();
    const userId = req.user.id || req.user.userId;
    const settings = req.body || {};
    const threshold = Number(settings.screening?.minimumMatchThreshold ?? 80);
    const booleanPreferences = [
      ['emailAlerts', settings.emailAlerts],
      ['matchingAlerts', settings.matchingAlerts],
      ['weeklyDigest', settings.weeklyDigest],
      ['screening.confirmationEmail', settings.screening?.confirmationEmail],
      ['screening.regretEmail', settings.screening?.regretEmail],
      ['screening.recruiterAlert', settings.screening?.recruiterAlert],
      ['telegram.broadcastApprovedJobs', settings.telegram?.broadcastApprovedJobs],
      ['telegram.includeSalary', settings.telegram?.includeSalary],
      ['telegram.includeApplyLink', settings.telegram?.includeApplyLink],
      ['telegram.interviewAlerts', settings.telegram?.interviewAlerts],
    ];
    const invalidBoolean = booleanPreferences.find(([, value]) => value !== undefined && typeof value !== 'boolean');
    if (invalidBoolean) {
      return res.status(400).json({ success: false, message: `${invalidBoolean[0]} must be a boolean.` });
    }
    const [existingRows] = await connection.execute(
      'SELECT workspacePreferences FROM employer_settings WHERE userId = ? LIMIT 1',
      [userId]
    );
    let existingPreferences = existingRows[0]?.workspacePreferences || {};
    if (typeof existingPreferences === 'string') {
      try {
        existingPreferences = JSON.parse(existingPreferences);
      } catch (parseError) {
        console.error('Employer workspace preferences contain invalid JSON:', parseError);
        existingPreferences = {};
      }
    }

    const existingCompany = existingPreferences.company || {};
    const existingScreening = existingPreferences.screening || {};
    const existingTelegram = existingPreferences.telegram || {};
    const company = {
      companyName: String(settings.company?.companyName ?? existingCompany.companyName ?? '').trim(),
      legalName: String(settings.company?.legalName ?? existingCompany.legalName ?? settings.company?.companyName ?? '').trim(),
      tradeBrandName: String(settings.company?.tradeBrandName ?? existingCompany.tradeBrandName ?? settings.company?.companyName ?? '').trim(),
      companyType: String(settings.company?.companyType ?? existingCompany.companyType ?? 'Startup').trim(),
      tinNumber: String(settings.company?.tinNumber ?? existingCompany.tinNumber ?? '').trim(),
      registrationNumber: String(settings.company?.registrationNumber ?? existingCompany.registrationNumber ?? '').trim(),
      industry: String(settings.company?.industry ?? existingCompany.industry ?? '').trim(),
      location: String(settings.company?.location ?? existingCompany.location ?? '').trim(),
      website: String(settings.company?.website ?? existingCompany.website ?? '').trim(),
      bio: String(settings.company?.bio ?? existingCompany.bio ?? '').trim(),
      logo: String(existingCompany.logo || '').trim(),
    };
    const companyTypes = ['PLC', 'Share Company (S.C.)', 'Foreign Entity', 'NGO', 'Startup'];
    if (company.companyName.length > 150 || company.legalName.length > 150 || company.tradeBrandName.length > 150
      || company.industry.length > 100 || company.location.length > 100 || company.website.length > 255
      || company.bio.length > 20000 || company.tinNumber.length > 50 || company.registrationNumber.length > 100
      || !companyTypes.includes(company.companyType)) {
      return res.status(400).json({ success: false, message: 'One or more company profile fields exceed the allowed length.' });
    }
    if (company.tinNumber && !/^\d{10}$/.test(company.tinNumber)) {
      return res.status(400).json({ success: false, message: 'TIN number must contain exactly 10 digits.' });
    }
    const submittedInvites = settings.team?.pendingInvites ?? existingPreferences.team?.pendingInvites ?? [];
    if (!Array.isArray(submittedInvites)) {
      return res.status(400).json({ success: false, message: 'Pending team invitations must be a list.' });
    }
    const pendingInvites = submittedInvites.map((invite) => ({
      email: String(invite && typeof invite === 'object' ? invite.email || '' : '').trim().toLowerCase(),
      role: String(invite && typeof invite === 'object' ? invite.role || '' : '').trim(),
      status: 'pending',
    }));
    if (pendingInvites.length > 4
      || pendingInvites.some((invite) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email)
        || !['Admin', 'Recruiter', 'Reviewer'].includes(invite.role))
      || new Set(pendingInvites.map((invite) => invite.email)).size !== pendingInvites.length) {
      return res.status(400).json({ success: false, message: 'Pending team invitations must have unique valid emails and supported roles, with up to four recruiter seats.' });
    }
    const screening = {
      minimumMatchThreshold: threshold,
      confirmationEmail: settings.screening?.confirmationEmail ?? existingScreening.confirmationEmail ?? true,
      recruiterAlert: settings.screening?.recruiterAlert ?? existingScreening.recruiterAlert ?? true,
      regretEmail: settings.screening?.regretEmail ?? existingScreening.regretEmail ?? false,
    };
    const telegram = {
      broadcastApprovedJobs: settings.telegram?.broadcastApprovedJobs ?? existingTelegram.broadcastApprovedJobs ?? false,
      interviewAlerts: settings.telegram?.interviewAlerts ?? existingTelegram.interviewAlerts ?? true,
      channel: String(settings.telegram?.channel ?? existingTelegram.channel ?? '').trim(),
      includeSalary: settings.telegram?.includeSalary ?? existingTelegram.includeSalary ?? true,
      includeApplyLink: settings.telegram?.includeApplyLink ?? existingTelegram.includeApplyLink ?? true,
    };
    for (const [key, value] of Object.entries({ ...screening, ...telegram })) {
      if (typeof value !== 'boolean' && !['minimumMatchThreshold', 'channel'].includes(key)) {
        return res.status(400).json({ success: false, message: `${key} must be a boolean.` });
      }
    }
    if (!Number.isInteger(threshold) || threshold < 60 || threshold > 95) {
      return res.status(400).json({ success: false, message: 'Minimum ATS match threshold must be from 60% to 95%.' });
    }
    if (telegram.channel && !/^@[a-zA-Z0-9_]{5,32}$/.test(telegram.channel)) {
      return res.status(400).json({ success: false, message: 'Enter a valid public Telegram channel username.' });
    }
    const team = { pendingInvites };
    const preferences = { ...existingPreferences, company, screening, telegram, team };

    await connection.beginTransaction();
    transactionStarted = true;
    await connection.execute(
      `INSERT INTO employer_settings
         (userId, emailAlerts, matchingAlerts, weeklyDigest, notificationEmail, teamPermissions, workspacePreferences)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         emailAlerts = VALUES(emailAlerts), matchingAlerts = VALUES(matchingAlerts),
         weeklyDigest = VALUES(weeklyDigest), notificationEmail = VALUES(notificationEmail),
         teamPermissions = VALUES(teamPermissions), workspacePreferences = VALUES(workspacePreferences)`,
      [
        userId,
        settings.emailAlerts !== undefined ? Boolean(settings.emailAlerts) : true,
        settings.matchingAlerts !== undefined ? Boolean(settings.matchingAlerts) : true,
        settings.weeklyDigest !== undefined ? Boolean(settings.weeklyDigest) : false,
        settings.notificationEmail || null,
        settings.teamPermissions ? JSON.stringify(settings.teamPermissions) : JSON.stringify({ canManageJobs: true, canReviewApplications: true, canMessageCandidates: true }),
        JSON.stringify(preferences),
      ]
    );
    if (company.companyName || company.legalName || company.registrationNumber || company.tinNumber
      || company.industry || company.location || company.website || company.bio) {
      await connection.execute(
        `UPDATE company_profiles
         SET company_name = COALESCE(NULLIF(?, ''), company_name),
             tin_number = ?, company_registration_number = ?,
             industry = ?, location = ?, website = ?, description = ?, company_summary = ?
         WHERE employer_id = ?`,
        [company.tradeBrandName || company.companyName, company.tinNumber || null,
          company.registrationNumber || null, company.industry || null, company.location || null, company.website || null,
          company.bio || null, company.bio || null, userId]
      );
      await connection.execute(
        `UPDATE employers
         SET company_name = COALESCE(NULLIF(?, ''), company_name), legalBusinessName = ?,
             industry = ?, tin_number = ?, headquarters_location = ?, website = ?, about_company = ?, description = ?
         WHERE user_id = ? OR userId = ?`,
        [company.tradeBrandName || company.companyName, company.legalName || null, company.industry || null,
          company.tinNumber || null, company.location || null, company.website || null,
          company.bio || null, company.bio || null, userId, userId]
      );
    }
    await connection.commit();
    transactionStarted = false;
    return res.json({
      success: true,
      settings: {
        ...preferences,
        emailAlerts: settings.emailAlerts !== undefined ? Boolean(settings.emailAlerts) : true,
        matchingAlerts: settings.matchingAlerts !== undefined ? Boolean(settings.matchingAlerts) : true,
        weeklyDigest: settings.weeklyDigest !== undefined ? Boolean(settings.weeklyDigest) : false,
        notificationEmail: settings.notificationEmail || '',
        userId,
      },
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    console.error('Employer Settings Update Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save settings.' });
  } finally {
    connection?.release();
  }
};

exports.uploadCompanyLogo = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'A company logo image is required.' });
  const { buffer, mimetype } = req.file;
  const isPng = mimetype === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = mimetype === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp = mimetype === 'image/webp'
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!isPng && !isJpeg && !isWebp) {
    return res.status(400).json({ success: false, message: 'The selected file is not a valid PNG, JPG, or WebP image.' });
  }

  const extension = isPng ? '.png' : isJpeg ? '.jpg' : '.webp';
  const filename = `${crypto.randomBytes(16).toString('hex')}${extension}`;
  const uploadDirectory = path.resolve(__dirname, '..', 'uploads', 'employer-logos');
  const logoUrl = `/uploads/employer-logos/${filename}`;
  let connection;
  let transactionStarted = false;
  let logoWritten = false;
  try {
    connection = await db.getConnection();
    await fs.promises.mkdir(uploadDirectory, { recursive: true });
    await fs.promises.writeFile(path.join(uploadDirectory, filename), buffer, { flag: 'wx' });
    logoWritten = true;
    await connection.beginTransaction();
    transactionStarted = true;
    const userId = req.user.id || req.user.userId;
    const [profileResult] = await connection.execute('UPDATE company_profiles SET logo_url = ? WHERE employer_id = ?', [logoUrl, userId]);
    const [employerResult] = await connection.execute('UPDATE employers SET logo_url = ? WHERE user_id = ? OR userId = ?', [logoUrl, userId, userId]);
    if (!profileResult.affectedRows && !employerResult.affectedRows) {
      throw new Error('Company profile was not found for this employer.');
    }
    await connection.execute(
      `INSERT INTO employer_settings (userId, workspacePreferences)
       VALUES (?, JSON_OBJECT('company', JSON_OBJECT('logo', ?)))
       ON DUPLICATE KEY UPDATE workspacePreferences = JSON_SET(
         COALESCE(workspacePreferences, JSON_OBJECT()), '$.company.logo', ?
       )`,
      [userId, logoUrl, logoUrl]
    );
    await connection.commit();
    transactionStarted = false;
    return res.json({ success: true, logoUrl });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (logoWritten) {
      await fs.promises.unlink(path.join(uploadDirectory, filename)).catch((cleanupError) => {
        console.error('Unable to remove failed company logo upload:', cleanupError.message);
      });
    }
    console.error('Company logo upload failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to save company logo.' });
  } finally {
    connection?.release();
  }
};
