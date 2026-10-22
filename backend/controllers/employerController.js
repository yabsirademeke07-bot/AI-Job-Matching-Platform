const db = require('../connection');
const fs = require('fs');
const path = require('path');
const employerDocumentDir = path.resolve(__dirname, '..', 'private', 'employer-documents');
const { createNotification } = require('../services/databaseNotificationService');

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

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
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

const normalizeScheduledDate = (value) => {
  const text = normalizeNullableText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace('T', ' ');
};

const normalizeJobPayload = (body = {}) => ({
  title: normalizeNullableText(body.title || body.jobTitle) || '',
  description: normalizeNullableText(body.description) || 'No description provided.',
  status: body.isScheduled === true || body.isScheduled === 'true' ? 'scheduled' : normalizeNullableText(body.status) || 'draft',
  category: normalizeNullableText(body.category || body.department || body.sector || body.categoryName) || 'General',
  job_type: normalizeNullableText(body.job_type || body.jobType || body.job_type_name) || 'full-time',
  experience_level: normalizeNullableText(body.experience_level || body.experienceLevel || body.experience_level_name) || 'mid-level',
  location: normalizeNullableText(body.location || body.locationValue) || 'Addis Ababa',
  country: normalizeNullableText(body.country) || 'Ethiopia',
  city: normalizeNullableText(body.city),
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
  min_experience: normalizeOptionalNumber(body.min_experience ?? body.minExperience),
  is_negotiable: normalizeBoolean(body.is_negotiable ?? body.is_salary_negotiable, true),
  vacancies: normalizeOptionalNumber(body.vacancies ?? body.vacancy_count ?? body.positions) ?? 1,
  currency: normalizeNullableText(body.currency || body.compensation || body.compensationCurrency) || 'ETB',
  salary_period: normalizeNullableText(body.salary_period || body.salaryPeriod) || 'monthly',
  is_salary_negotiable: normalizeBoolean(body.is_negotiable ?? body.is_salary_negotiable, true),
  benefits: normalizeNullableText(body.benefits),
  required_education: normalizeNullableText(body.required_education || body.requiredEducation || body.education) || 'any',
  years_of_experience_min: normalizeOptionalNumber(body.min_experience ?? body.minExperience ?? body.years_of_experience_min ?? body.yearsOfExperienceMin) ?? 0,
  years_of_experience_max: normalizeOptionalNumber(body.years_of_experience_max ?? body.yearsOfExperienceMax) ?? 20,
  application_deadline: normalizeOptionalDate(body.application_deadline ?? body.applicationDeadline ?? body.deadline),
  scheduled_date: normalizeScheduledDate(body.scheduledAt ?? body.scheduledDate ?? body.scheduled_date),
  is_urgent: Boolean(body.is_urgent || body.isUrgent),
  required_skills: normalizeList(body.required_skills ?? body.requiredSkills ?? body.skills).map((skill) => typeof skill === 'string' ? { skill_name: skill } : skill),
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
    await db.execute('UPDATE users SET phone = ? WHERE id = ?', [companyPhone, userId]);
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
    const [shortlistRows] = await db.execute(
      `SELECT COUNT(*) AS shortlisted FROM (
         SELECT a.job_seeker_id AS candidateId FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.employer_id = ? AND LOWER(a.status) = 'shortlisted'
         UNION
         SELECT tp.candidateId FROM talent_pool tp WHERE tp.employerId = ?
       ) AS shortlisted_candidates`,
      [req.user.id, req.user.id]
    );
    appStats[0].shortlisted = shortlistRows[0]?.shortlisted || 0;
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
            AND (LOWER(j.status) = 'active' OR j.application_deadline >= NOW())) AS active_jobs,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ?) AS total_applicants,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ? AND a.ai_match_score >= 80) AS high_ai_matches,
         (SELECT COUNT(*) FROM applications a
          JOIN jobs j ON j.id = a.job_id
          WHERE j.employer_id = ?
            AND LOWER(REPLACE(a.status, '_', '-')) IN ('pending', 'applied', 'new')) AS pending_review,
         (SELECT COUNT(*) FROM (
            SELECT a.job_seeker_id AS candidateId FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.employer_id = ? AND LOWER(a.status) = 'shortlisted'
            UNION
            SELECT tp.candidateId FROM talent_pool tp WHERE tp.employerId = ?
          ) AS shortlisted_candidates) AS shortlisted,
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
      Array(9).fill(req.user.id),
    );

    const row = rows[0] || {};
    return res.json({
      success: true,
      stats: {
        active_jobs: normalizePipelineCounts(row.active_jobs),
        total_applicants: normalizePipelineCounts(row.total_applicants),
        high_ai_matches: normalizePipelineCounts(row.high_ai_matches),
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

exports.getEmployerApplications = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT a.id, a.job_id AS jobId, a.status, a.ai_match_score AS aiMatchScore, a.applied_at AS appliedAt, u.full_name AS candidateName, u.email AS candidateEmail, j.title AS jobTitle FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.job_seeker_id WHERE j.employer_id = ? ORDER BY a.applied_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, applications: rows });
  } catch (error) {
    console.error('Employer Applications Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch applications.' });
  }
};

exports.createJob = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const job = normalizeJobPayload(req.body);
    if (!job.title || !job.description || !job.application_deadline) return res.status(400).json({ success: false, message: 'Title, description, and application deadline are required.' });
    if (job.salary_min !== null && job.salary_min < 0 || job.salary_max !== null && job.salary_max < 0) {
      return res.status(400).json({ success: false, message: 'Salary amounts cannot be negative.' });
    }
    if (!Number.isInteger(job.vacancies) || job.vacancies < 1) return res.status(400).json({ success: false, message: 'Vacancies must be a whole number of at least 1.' });
    if (job.min_experience !== null && (!Number.isInteger(job.min_experience) || job.min_experience < 0)) return res.status(400).json({ success: false, message: 'Minimum experience must be a non-negative whole number.' });
    if (job.salary_min !== null && job.salary_max !== null && job.salary_max < job.salary_min) {
      return res.status(400).json({ success: false, message: 'Maximum salary must be greater than or equal to minimum salary.' });
    }
    if (job.status === 'scheduled' && !job.scheduled_date) return res.status(400).json({ success: false, message: 'A valid scheduledAt ISO timestamp is required for scheduled jobs.' });
    await connection.beginTransaction();
    const slug = `${job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;
    const [result] = await connection.execute(`INSERT INTO jobs (employer_id, title, slug, description, category, job_type, experience_level, location, country, city, work_mode, gender_preference, salary_min, salary_max, currency, salary_period, is_salary_negotiable, is_negotiable, benefits, required_education, min_experience, years_of_experience_min, years_of_experience_max, vacancies, application_deadline, scheduled_date, is_urgent, status, approval_status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`, [req.user.id, job.title, slug, job.description, job.category, job.job_type, job.experience_level, job.location, job.country, job.city, job.work_mode, job.gender_preference, job.salary_min, job.salary_max, job.currency, job.salary_period, job.is_salary_negotiable, job.is_negotiable, job.benefits, job.required_education, job.min_experience, job.years_of_experience_min, job.years_of_experience_max, job.vacancies, job.application_deadline, job.scheduled_date, job.is_urgent, job.status || 'draft', job.status === 'published' ? new Date() : null]);
    const jobId = result.insertId;
    for (const skill of job.required_skills) if (skill.skill_name) await connection.execute('INSERT INTO job_required_skills (job_id, skill_name, proficiency_level, is_must_have) VALUES (?, ?, ?, ?)', [jobId, String(skill.skill_name).trim(), skill.proficiency_level || 'intermediate', Boolean(skill.is_must_have)]);
    for (const language of job.required_languages) if (language.language_name) await connection.execute('INSERT INTO job_required_languages (job_id, language_name, proficiency, is_must_have) VALUES (?, ?, ?, ?)', [jobId, String(language.language_name).trim(), language.proficiency || 'professional-working', Boolean(language.is_must_have)]);
    await connection.execute('INSERT INTO job_analytics (job_id) VALUES (?)', [jobId]);
    await connection.commit();
    const [rows] = await connection.execute("SELECT *, DATE_FORMAT(scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt FROM jobs WHERE id = ?", [jobId]);
    return res.status(201).json({ success: true, ...rows[0], isScheduled: job.status === 'scheduled', jobId, id: jobId, slug });
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
    const [jobs] = await db.execute(
      `SELECT j.*, DATE_FORMAT(j.scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt,
              COUNT(a.id) AS applicantsCount,
              COALESCE(SUM(a.status = 'pending' OR a.status = 'applied' OR a.status = 'pending_review'), 0) AS pendingCount,
              COALESCE(SUM(a.status = 'shortlisted'), 0) AS shortlisted,
              COALESCE(SUM(a.status = 'interviewed' OR a.status = 'interview'), 0) AS interviewCount,
              COALESCE(SUM(a.status = 'hired'), 0) AS hiredCount
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.employer_id = ?
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [req.user.id],
    );
    return res.json({ success: true, jobs: jobs.map((job) => ({ ...job, isScheduled: String(job.status).toLowerCase() === 'scheduled' && Boolean(job.scheduledAt) })) });
  } catch (error) {
    console.error('Get Employer Jobs Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve jobs.' });
  }
};

exports.updateJob = async (req, res) => {
  const job = normalizeJobPayload(req.body);
  if (job.salary_min !== null && job.salary_min < 0 || job.salary_max !== null && job.salary_max < 0) {
    return res.status(400).json({ success: false, message: 'Salary amounts cannot be negative.' });
  }
  if (!Number.isInteger(job.vacancies) || job.vacancies < 1) return res.status(400).json({ success: false, message: 'Vacancies must be a whole number of at least 1.' });
  if (job.min_experience !== null && (!Number.isInteger(job.min_experience) || job.min_experience < 0)) return res.status(400).json({ success: false, message: 'Minimum experience must be a non-negative whole number.' });
  if (job.salary_min !== null && job.salary_max !== null && job.salary_max < job.salary_min) {
    return res.status(400).json({ success: false, message: 'Maximum salary must be greater than or equal to minimum salary.' });
  }
  if (job.status === 'scheduled' && !job.scheduled_date) return res.status(400).json({ success: false, message: 'A valid scheduledAt ISO timestamp is required for scheduled jobs.' });
  try {
    const [result] = await db.execute(`UPDATE jobs SET title = ?, description = ?, category = ?, job_type = ?, experience_level = ?, location = ?, work_mode = ?, gender_preference = ?, salary_min = ?, salary_max = ?, currency = ?, is_salary_negotiable = ?, is_negotiable = ?, benefits = ?, required_education = ?, min_experience = ?, years_of_experience_min = ?, vacancies = ?, application_deadline = ?, scheduled_date = ?, status = 'pending_approval', approval_status = 'pending', is_approved = FALSE, approved_at = NULL, approved_by = NULL WHERE id = ? AND employer_id = ?`, [job.title, job.description, job.category, job.job_type, job.experience_level, job.location, job.work_mode, job.gender_preference, job.salary_min, job.salary_max, job.currency, job.is_salary_negotiable, job.is_negotiable, job.benefits, job.required_education, job.min_experience, job.years_of_experience_min, job.vacancies, job.application_deadline, job.scheduled_date, req.params.jobId, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Job not found.' });
    const [rows] = await db.execute("SELECT *, DATE_FORMAT(scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt FROM jobs WHERE id = ?", [req.params.jobId]);
    return res.json({ success: true, ...rows[0], isScheduled: String(rows[0]?.status).toLowerCase() === 'scheduled' && Boolean(rows[0]?.scheduledAt) });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to update job.' }); }
};

exports.setJobStatus = async (req, res) => {
  const requestedStatus = String(req.body.status === 'paused' ? 'closed' : (req.body.status || 'pending_approval')).toLowerCase();
  const status = ['draft', 'scheduled', 'closed'].includes(requestedStatus) ? requestedStatus : 'pending_approval';
  try {
    const scheduledDate = req.body.scheduledDate || req.body.scheduled_date || null;
    const [result] = await db.execute(`UPDATE jobs SET status = CASE WHEN ? IN ('published', 'active') AND approval_status = 'approved' THEN 'active' WHEN ? IN ('published', 'active') THEN 'pending_approval' ELSE ? END, scheduled_date = COALESCE(?, scheduled_date) WHERE id = ? AND employer_id = ?`, [requestedStatus, requestedStatus, status, scheduledDate, req.params.jobId, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Job not found.' });
    const [rows] = await db.execute('SELECT * FROM jobs WHERE id = ? AND employer_id = ?', [req.params.jobId, req.user.id]);
    return res.json({ success: true, status, job: rows[0] || null, ...(rows[0] || {}) });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to update job status.' }); }
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
    const [applicants] = await db.execute(
      `SELECT a.id AS application_id, a.job_id, a.job_seeker_id, a.status,
              a.ai_match_score, a.skills_match_score, a.experience_match_score,
              a.education_match_score, a.location_match_score, a.seeker_cover_letter,
              a.resume_snapshot, a.applied_at,
              u.full_name, u.email, u.phone, u.avatar_url,
              jsp.headline, jsp.location AS candidate_location, jsp.skills AS profile_skills,
              jsp.experience_level, jsp.education AS profile_education,
              jsp.education_level,
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
       WHERE a.job_id = ?
       ORDER BY a.ai_match_score DESC, a.applied_at DESC`,
      [req.params.jobId],
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
        candidateLocation: applicant.candidate_location,
        aiMatchScore: Number(applicant.ai_match_score || 0),
        matchScore: Number(applicant.ai_match_score || 0),
        matchedSkills,
        missingSkills,
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
    return res.json({ success: true, job: job[0], applicants: enrichedApplicants });
  } catch (error) {
    console.error('Get Employer Job Applicants Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve applicants.' });
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
    const [candidates] = await db.execute(
      `SELECT u.id, u.full_name AS fullName, u.email, u.phone,
              COALESCE(tp.primaryRole, jsp.headline) AS preferredDepartment,
              jsp.preferred_job_type AS preferredJobType,
              tp.aiMatchScore, tp.skills, tp.notes, tp.savedAt,
              c.file_name AS cvFileName, c.file_url AS resumeUrl,
              jsp.profile_completion_percentage, jsp.skills AS profileSkills,
              EXISTS(SELECT 1 FROM notifications n WHERE n.user_id = u.id AND n.type = 'SHORTLIST' AND n.reference_type = 'TALENT_POOL' AND n.reference_id = u.id AND n.related_user_id = tp.employerId) AS shortlistNotificationSent
       FROM users u
       JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
       LEFT JOIN talent_pool tp ON tp.candidateId = u.id AND tp.employerId = ?
       LEFT JOIN cvs c ON c.user_id = u.id AND c.is_primary = TRUE
       WHERE u.role = 'job_seeker'
       ORDER BY (tp.savedAt IS NOT NULL) DESC, jsp.profile_completion_percentage DESC, u.created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, candidates: candidates.map((candidate) => {
      let keySkills = candidate.skills || candidate.profileSkills || [];
      if (typeof keySkills === 'string') {
        try { keySkills = JSON.parse(keySkills); } catch { keySkills = normalizeList(keySkills); }
      }
      return {
        ...candidate,
        keySkills: Array.isArray(keySkills) ? keySkills : [],
        experience: 'Experience TBD',
        aiMatchScore: Number(candidate.aiMatchScore || 0),
        shortlisted: Boolean(candidate.savedAt),
        shortlistNotificationSent: Boolean(candidate.shortlistNotificationSent),
      };
    }) });
  } catch (error) { return res.status(500).json({ success: false, message: 'Failed to retrieve talent pool.' }); }
};

exports.getShortlistedTalentPool = async (req, res) => {
  try {
    const [candidates] = await db.execute(
      `SELECT tp.candidateId, tp.candidateName AS fullName, u.email, u.phone,
              tp.primaryRole AS preferredDepartment, jsp.preferred_job_type AS preferredJobType,
              tp.aiMatchScore, tp.skills, tp.notes, tp.savedAt,
              c.file_name AS cvFileName, c.file_url AS resumeUrl
       FROM talent_pool tp
       JOIN users u ON u.id = tp.candidateId
       LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
       LEFT JOIN cvs c ON c.user_id = u.id AND c.is_primary = TRUE
       WHERE tp.employerId = ?
       ORDER BY tp.savedAt DESC`,
      [req.user.id]
    );
    return res.json({
      success: true,
      candidates: candidates.map((candidate) => {
        let keySkills = candidate.skills || [];
        if (typeof keySkills === 'string') {
          try { keySkills = JSON.parse(keySkills); } catch { keySkills = normalizeList(keySkills); }
        }
        return { ...candidate, keySkills: Array.isArray(keySkills) ? keySkills : [], shortlisted: true };
      }),
    });
  } catch (error) {
    console.error('Get Employer Shortlist Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve shortlisted candidates.' });
  }
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

    const connection = await db.getConnection();
    let transactionStarted = false;
    let notificationSent = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      await connection.execute(
        `INSERT INTO talent_pool (employerId, candidateId, candidateName, primaryRole, skills, aiMatchScore, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE candidateName = VALUES(candidateName), primaryRole = VALUES(primaryRole), skills = VALUES(skills), aiMatchScore = VALUES(aiMatchScore), notes = VALUES(notes)`,
        [payload.employerId, payload.candidateId, payload.candidateName, payload.primaryRole, payload.skills, payload.aiMatchScore, payload.notes]
      );
      await connection.execute('SELECT id FROM talent_pool WHERE employerId = ? AND candidateId = ? FOR UPDATE', [payload.employerId, candidateId]);
      const [existingNotifications] = await connection.execute(
        `SELECT id FROM notifications
         WHERE user_id = ? AND type = 'SHORTLIST' AND reference_type = 'TALENT_POOL' AND reference_id = ? AND related_user_id = ?
         LIMIT 1`,
        [candidateId, candidateId, payload.employerId]
      );
      notificationSent = existingNotifications.length > 0;
      if (!notificationSent) {
        const [[employer]] = await connection.execute('SELECT full_name FROM users WHERE id = ? LIMIT 1', [payload.employerId]);
        await createNotification({
          executor: connection,
          userId: candidateId,
          type: 'SHORTLIST',
          title: 'Your profile was shortlisted',
          message: `${employer?.full_name || 'An employer'} added your profile to their talent shortlist for future opportunities. This is not a job application.`,
          referenceType: 'TALENT_POOL',
          referenceId: candidateId,
          relatedUserId: payload.employerId,
        });
        notificationSent = true;
      }
      await connection.commit();
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.json({ success: true, notificationSent, message: 'Candidate saved to talent pool.' });
  } catch (error) {
    console.error('Save Talent Pool Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save talent pool candidate.' });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  const validStatuses = ['pending', 'review', 'shortlisted', 'interviewed', 'hired', 'rejected'];
  const requestedStatus = normalizeApplicationStatus(req.body.status);

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
              employer.full_name AS employerName
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users employer ON employer.id = j.employer_id
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
      [requestedStatus, req.body.employer_notes || null, req.params.applicationId],
    );
    if (normalizeApplicationStatus(application.status) !== requestedStatus) {
      const companyName = application.companyName || application.employerName || 'the company';
      const statusLabel = requestedStatus.charAt(0).toUpperCase() + requestedStatus.slice(1);
      const message = requestedStatus === 'shortlisted'
        ? `Your application for ${application.jobTitle} has been Shortlisted!`
        : requestedStatus === 'hired'
          ? `Congratulations! You have been marked as Hired at ${companyName}`
          : `Your application for ${application.jobTitle} has been ${statusLabel}.`;
      await createNotification({
        executor: connection,
        userId: application.candidateId,
        type: requestedStatus === 'hired' ? 'HIRING' : requestedStatus === 'shortlisted' ? 'SHORTLIST' : 'APPLICATION',
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
    return res.json({ success: true, status: requestedStatus });
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
       WHERE j.employer_id = ?
       ORDER BY a.applied_at DESC`,
      [req.user.id]
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
         interview_url = VALUES(interview_url), interview_status = 'scheduled', notes = VALUES(notes)`,
      [targetApplication, interview_type || interviewType || 'video', scheduledAt, duration_minutes || 60, interview_url || meetingLink || null, req.user.id, notes || null],
    );
    await connection.execute("UPDATE applications SET status = 'interview' WHERE id = ?", [targetApplication]);
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
    return res.json({ success: true, message: 'Interview scheduled.' });
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
    const [[conversation]] = await db.execute('SELECT id, job_seeker_id AS candidateId FROM conversations WHERE id = ? AND employer_id = ?', [conversationId, req.user.id]);
    const [result] = await db.execute('INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, is_read) VALUES (?, ?, ?, ?, FALSE)', [conversationId, req.user.id, conversation.candidateId, body]);
    await db.execute('UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?', [conversationId]);
    await createNotification({ userId: conversation.candidateId, type: 'MESSAGE', title: 'New Message', message: 'You received a new message from an employer.', referenceType: 'MESSAGE', referenceId: result.insertId, relatedUserId: req.user.id });
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
    const [[conversation]] = await db.execute('SELECT id, job_seeker_id AS candidateId FROM conversations WHERE id = ? AND employer_id = ? AND status <> \'archived\'', [req.params.conversationId, req.user.id]);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    const [result] = await db.execute('INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text, is_read) VALUES (?, ?, ?, ?, FALSE)', [conversation.id, req.user.id, conversation.candidateId, message]);
    await db.execute('UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = ? AND employer_id = ?', [conversation.id, req.user.id]);
    await createNotification({ userId: conversation.candidateId, type: 'MESSAGE', title: 'New Message', message: 'You received a new message from an employer.', referenceType: 'MESSAGE', referenceId: result.insertId, relatedUserId: req.user.id });
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
    const [rows] = await db.execute('SELECT * FROM employer_settings WHERE userId = ?', [req.user.id]);
    return res.json({ success: true, settings: rows[0] || { userId: req.user.id, emailAlerts: true, matchingAlerts: true, weeklyDigest: false } });
  } catch (error) {
    console.error('Employer Settings Fetch Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
};

exports.updateEmployerSettings = async (req, res) => {
  try {
    const settings = req.body || {};
    await db.execute(
      `INSERT INTO employer_settings (userId, emailAlerts, matchingAlerts, weeklyDigest, notificationEmail, teamPermissions)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE emailAlerts = VALUES(emailAlerts), matchingAlerts = VALUES(matchingAlerts), weeklyDigest = VALUES(weeklyDigest), notificationEmail = VALUES(notificationEmail), teamPermissions = VALUES(teamPermissions)`,
      [
        req.user.id,
        settings.emailAlerts !== undefined ? Boolean(settings.emailAlerts) : true,
        settings.matchingAlerts !== undefined ? Boolean(settings.matchingAlerts) : true,
        settings.weeklyDigest !== undefined ? Boolean(settings.weeklyDigest) : false,
        settings.notificationEmail || null,
        settings.teamPermissions ? JSON.stringify(settings.teamPermissions) : JSON.stringify({ canManageJobs: true, canReviewApplications: true, canMessageCandidates: true })
      ]
    );
    return res.json({ success: true, settings: { ...settings, userId: req.user.id } });
  } catch (error) {
    console.error('Employer Settings Update Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save settings.' });
  }
};
