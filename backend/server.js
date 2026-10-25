require("dotenv").config({ path: require("node:path").resolve(__dirname, ".env") });

const express = require("express");
const crypto = require("node:crypto");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const db = require("./config/db");
const { getJwtSecret } = require("./config/jwt");
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobRoutes");
const jobController = require("./controllers/jobController");
const matchRoutes = require("./routes/matchRoutes");
const jobSeekerRoutes = require("./routes/jobSeekerRoutes");
const { applicationRoutes, rootAppRouter } = require("./routes/applicationRoutes");
const cvRoutes = require("./routes/cvRoutes");
const seekerMatchingRoutes = require("./routes/seekerMatchingRoutes");
const profileRoutes = require("./routes/profileRoutes");
const aboutRoutes = require("./routes/aboutRoutes");
const contactRoutes = require("./routes/contactRoutes");
const howItWorksRoutes = require("./routes/howItWorksRoutes");
const { issueOtp } = require("./services/otpService");
const { syncGoogleUser } = require("./config/googleAuth");
const { validateSignUp, validateLogin } = require("./middleware/validateAuth");
const { normalizeSalaryType } = require("./utils/jobSalary");
const { normalizeSubSectors } = require("./utils/jobSubSectors");
const { notifySeekersAboutJob } = require("./services/databaseNotificationService");
const { dispatchPublishedJobNotifications, isPubliclyEligibleJob, syncActiveJobsToPublicChannel, sendDeadlineReminders, configureTelegramWebhook } = require("./services/telegramService");
const { sendDailyAdminStatsOnce } = require("./services/telegramNotifier");
require("./config/passport");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = getJwtSecret();

const ensureJobColumn = async (columnName, columnDefinition) => {
  const [rows] = await db.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs' AND COLUMN_NAME = ?
     LIMIT 1`,
    [columnName]
  );
  if (!rows.length) {
    await db.query(`ALTER TABLE jobs ADD COLUMN \`${columnName}\` ${columnDefinition}`);
  }
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  })
);
app.use(passport.initialize());
app.use(passport.session());

const uploadDir = path.join(__dirname, 'uploads', 'cvs');
const frontendDistPath = path.resolve(__dirname, '..', 'frontend', 'dist');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const reportUploadDir = path.join(__dirname, 'uploads', 'reports');
if (!fs.existsSync(reportUploadDir)) fs.mkdirSync(reportUploadDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(frontendDistPath, { index: false }));
app.use('/api/contact', contactRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/how-it-works', howItWorksRoutes);
app.use('/api/companies', require('./routes/companyFeedbackRoutes'));
app.use('/api/applications', applicationRoutes);
app.use('/api', rootAppRouter);
app.use('/api/telegram', require('./routes/telegramRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

const ensureDatabaseSchema = async () => {
  const [telegramColumns] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
  );
  const telegramColumnNames = new Set(telegramColumns.map(({ COLUMN_NAME: name }) => name));
  if (!telegramColumnNames.has('telegram_chat_id')) {
    await db.query('ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(50) NULL DEFAULT NULL');
  }
  if (!telegramColumnNames.has('telegram_username')) {
    await db.query('ALTER TABLE users ADD COLUMN telegram_username VARCHAR(100) NULL DEFAULT NULL');
  }
  if (!telegramColumnNames.has('is_telegram_alerts_active')) {
    await db.query('ALTER TABLE users ADD COLUMN is_telegram_alerts_active BOOLEAN NOT NULL DEFAULT TRUE');
  }
  if (!telegramColumnNames.has('is_alerts_enabled')) {
    await db.query('ALTER TABLE users ADD COLUMN is_alerts_enabled BOOLEAN NOT NULL DEFAULT FALSE');
    await db.query(
      `UPDATE users SET is_alerts_enabled = TRUE
       WHERE telegram_chat_id IS NOT NULL AND is_telegram_alerts_active = TRUE`,
    );
  }
  await db.query(`CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    email_job_matches BOOLEAN DEFAULT TRUE,
    email_application_updates BOOLEAN DEFAULT TRUE,
    email_messages BOOLEAN DEFAULT TRUE,
    email_interviews BOOLEAN DEFAULT TRUE,
    email_ai_recommendations BOOLEAN DEFAULT TRUE,
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    daily_digest BOOLEAN DEFAULT FALSE,
    telegram_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    application_updates BOOLEAN NOT NULL DEFAULT TRUE,
    interview_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    matching_job_recommendations BOOLEAN NOT NULL DEFAULT FALSE,
    chat_messages BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  const [preferenceColumns] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_preferences'`,
  );
  const preferenceColumnNames = new Set(preferenceColumns.map(({ COLUMN_NAME: name }) => name));
  const telegramPreferenceColumns = {
    telegram_alerts_enabled: 'BOOLEAN NOT NULL DEFAULT TRUE',
    application_updates: 'BOOLEAN NOT NULL DEFAULT TRUE',
    interview_reminders: 'BOOLEAN NOT NULL DEFAULT TRUE',
    matching_job_recommendations: 'BOOLEAN NOT NULL DEFAULT FALSE',
    chat_messages: 'BOOLEAN NOT NULL DEFAULT TRUE',
  };
  for (const [columnName, definition] of Object.entries(telegramPreferenceColumns)) {
    if (!preferenceColumnNames.has(columnName)) {
      await db.query(`ALTER TABLE notification_preferences ADD COLUMN \`${columnName}\` ${definition}`);
    }
  }
  await db.query(`CREATE TABLE IF NOT EXISTS notification_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_role ENUM('seeker', 'employer', 'admin') NOT NULL,
    recipient_chat_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    title VARCHAR(150) NOT NULL,
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_logs_sent_at (sent_at),
    INDEX idx_notification_logs_event_type (event_type)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS dispatched_events (
    event_key VARCHAR(120) PRIMARY KEY,
    recipient_id VARCHAR(50) NOT NULL,
    dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS notification_failure_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    error_code VARCHAR(60) NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_failure_created (created_at),
    INDEX idx_notification_failure_event (event_type)
  )`);
  const [telegramIndexes] = await db.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_telegram_chat_id'`,
  );
  if (!telegramIndexes.length) {
    await db.query('CREATE INDEX idx_users_telegram_chat_id ON users (telegram_chat_id)');
  }
  await db.query(`CREATE TABLE IF NOT EXISTS telegram_notification_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    event_type ENUM('deadline_reminder') NOT NULL,
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE KEY uq_telegram_job_event_date (job_id, event_type, event_date),
    INDEX idx_telegram_event_date (event_type, event_date)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS telegram_link_verifications (
    user_id INT PRIMARY KEY,
    chat_id VARCHAR(50) NOT NULL,
    telegram_username VARCHAR(100) NULL,
    code_hash CHAR(64) NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_telegram_verification_expiry (expires_at)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS telegram_bot_link_tokens (
    user_id INT PRIMARY KEY,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_telegram_bot_link_expiry (expires_at)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS telegram_admin_sso_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_telegram_admin_sso_expiry (expires_at)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS telegram_candidate_match_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    job_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_telegram_candidate_job_match (user_id, job_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS telegram_admin_daily_stats (
    stat_date DATE PRIMARY KEY,
    status ENUM('sending', 'sent', 'failed') NOT NULL DEFAULT 'sending',
    locked_at DATETIME NOT NULL,
    sent_at DATETIME NULL
  )`);
  const [applicationColumns] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications'`,
  );
  const applicationColumnNames = new Set(applicationColumns.map(({ COLUMN_NAME: name }) => name));
  const requiredApplicationColumns = {
    employer_id: 'INT NULL',
    ai_match_summary: 'TEXT NULL',
    ai_strengths: 'JSON NULL',
    ai_missing_skills: 'JSON NULL',
    domain_match_score: 'DECIMAL(5, 2) NULL',
    soft_skills_match_score: 'DECIMAL(5, 2) NULL',
    title_match_score: 'DECIMAL(5, 2) NULL',
  };
  for (const [columnName, definition] of Object.entries(requiredApplicationColumns)) {
    if (!applicationColumnNames.has(columnName)) {
      await db.query(`ALTER TABLE applications ADD COLUMN \`${columnName}\` ${definition}`);
    }
  }
  await db.query(
    `UPDATE applications a
     JOIN jobs j ON j.id = a.job_id
     SET a.employer_id = j.employer_id
     WHERE a.employer_id IS NULL`,
  );
  const [applicationEmployerIndexes] = await db.query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications'
       AND INDEX_NAME = 'idx_employer_id'`,
  );
  if (!applicationEmployerIndexes.length) {
    await db.query('CREATE INDEX idx_employer_id ON applications (employer_id)');
  }
  const [candidateResponseColumns] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'interviews' AND COLUMN_NAME = 'candidate_response'`,
  );
  if (!candidateResponseColumns.length) {
    await db.query(
      `ALTER TABLE interviews ADD COLUMN candidate_response
       ENUM('pending', 'accepted', 'reschedule_requested', 'declined') DEFAULT 'pending'`,
    );
  }
  await db.query(`CREATE TABLE IF NOT EXISTS application_timeline_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    stage_name VARCHAR(80) NOT NULL,
    status_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    INDEX idx_application_timeline (application_id, created_at)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS candidate_application_notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
  )`);

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS household_employers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      employer_type VARCHAR(50) NOT NULL DEFAULT 'individual',
      full_name VARCHAR(255) NOT NULL,
      role_relationship VARCHAR(150) NULL,
      work_email VARCHAR(255) NULL,
      phone_number VARCHAR(50) NOT NULL,
      household_name VARCHAR(255) NOT NULL,
      industry VARCHAR(150) DEFAULT 'Domestic & Home Services',
      household_members VARCHAR(50) DEFAULT '1-2 People',
      residence_location VARCHAR(255) NOT NULL,
      about_household TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
  } catch (error) {
    console.warn('Household employer schema compatibility check skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS user_id INT NULL UNIQUE');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS employer_type VARCHAR(50) DEFAULT \'company\'');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS representative_name VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS job_title VARCHAR(150) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS representative_title VARCHAR(150) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS work_email VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS company_size VARCHAR(50) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS tin_number VARCHAR(50) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS trade_license_document VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS industry VARCHAR(150) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS headquarters_location VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS social_media TEXT NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS about_company TEXT NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS description TEXT NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS mission TEXT NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS vision TEXT NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS services TEXT NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS culture TEXT NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS benefits TEXT NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS founded_year INT NULL');
    await db.query("ALTER TABLE employers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'Pending'");
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    await db.query('UPDATE employers SET user_id = userId WHERE user_id IS NULL');
    await db.query('ALTER TABLE employers MODIFY COLUMN userId INT NULL');
    await db.query('ALTER TABLE employers MODIFY COLUMN companyName VARCHAR(150) NULL DEFAULT NULL');
  } catch (error) {
    console.warn('Employer profile schema compatibility update skipped:', error.message);
  }

  try {
    await db.query(`ALTER TABLE users
      MODIFY COLUMN role ENUM('super_admin', 'admin', 'employer', 'job_seeker') NOT NULL DEFAULT 'job_seeker'`);
    await db.query(`ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL`);
  } catch (error) {
    console.warn('Role/password compatibility update skipped:', error.message);
  }

  try {
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step ENUM('role_selection', 'cv_upload', 'personal_info', 'company_profile', 'company_legal') NULL DEFAULT 'role_selection'");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cv_url VARCHAR(255) NULL");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS cv_status ENUM('uploaded', 'skipped', 'none') NOT NULL DEFAULT 'none'");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE");
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step_completed ENUM('cv_upload', 'manual_profile', 'completed') NOT NULL DEFAULT 'cv_upload'");
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS seeker_onboarded BOOLEAN NOT NULL DEFAULT FALSE');
    await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS employer_onboarded BOOLEAN NOT NULL DEFAULT FALSE');
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_role ENUM('seeker', 'employer', 'admin') DEFAULT 'seeker'");
    await db.query(`UPDATE users u
      SET seeker_onboarded = TRUE
      WHERE u.is_profile_complete = TRUE
        OR u.onboarding_step_completed = 'completed'
        OR EXISTS (
        SELECT 1 FROM job_seeker_profiles jsp
        WHERE jsp.user_id = u.id
          AND (jsp.is_profile_complete = TRUE OR jsp.profile_completed = TRUE
            OR jsp.profile_completion_percentage >= 100 OR jsp.onboarding_step_completed = 'completed')
      ) OR EXISTS (
        SELECT 1 FROM cvs c
        JOIN job_seeker_profiles jsp ON jsp.user_id = c.user_id
        WHERE c.user_id = u.id AND c.is_active = TRUE
          AND COALESCE(NULLIF(TRIM(jsp.headline), ''), '') <> ''
          AND COALESCE(NULLIF(TRIM(jsp.bio), ''), '') <> ''
          AND COALESCE(NULLIF(TRIM(jsp.location), ''), '') <> ''
          AND COALESCE(NULLIF(TRIM(jsp.city), ''), '') <> ''
      )`);
    await db.query(`UPDATE users u
      SET employer_onboarded = TRUE
      WHERE EXISTS (
        SELECT 1 FROM company_profiles cp
        WHERE cp.employer_id = u.id AND cp.onboarding_completed = TRUE
      ) OR EXISTS (
        SELECT 1 FROM employers e
        WHERE (e.user_id = u.id OR e.userId = u.id)
          AND COALESCE(NULLIF(TRIM(e.company_name), ''), '') <> ''
          AND COALESCE(NULLIF(TRIM(e.industry), ''), '') <> ''
          AND COALESCE(NULLIF(TRIM(e.headquarters_location), ''), '') <> ''
      ) OR EXISTS (
        SELECT 1 FROM household_employers he
        WHERE he.user_id = u.id
          AND COALESCE(NULLIF(TRIM(he.household_name), ''), '') <> ''
          AND COALESCE(NULLIF(TRIM(he.residence_location), ''), '') <> ''
      )`);
    await db.query("ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS onboarding_step ENUM('role_selection', 'cv_upload', 'personal_info', 'company_profile', 'company_legal') NULL DEFAULT 'role_selection'");
    await db.query("ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS onboarding_step ENUM('role_selection', 'cv_upload', 'personal_info', 'company_profile', 'company_legal') NULL DEFAULT 'role_selection'");
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS representative_name VARCHAR(255) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS representative_title VARCHAR(150) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS employer_type VARCHAR(50) NOT NULL DEFAULT \'company\'');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tin_number VARCHAR(50) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tin_certificate_url VARCHAR(255) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS tin_certificate_name VARCHAR(255) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trade_license_number VARCHAR(100) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trade_license_url VARCHAR(255) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trade_license_name VARCHAR(255) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trade_license_size_bytes INT UNSIGNED NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trade_license_uploaded_at TIMESTAMP NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS trade_license_official_document BOOLEAN NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS work_email VARCHAR(255) NULL');
    await db.query('ALTER TABLE company_profiles MODIFY COLUMN website VARCHAR(255) NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles MODIFY COLUMN logo_url VARCHAR(255) NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles MODIFY COLUMN description TEXT NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles MODIFY COLUMN company_size VARCHAR(50) NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles MODIFY COLUMN company_registration_number VARCHAR(100) NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL');
    await db.query('ALTER TABLE company_profiles MODIFY COLUMN phone VARCHAR(50) NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles MODIFY COLUMN work_email VARCHAR(255) NULL DEFAULT NULL');
    await db.query('ALTER TABLE company_profiles MODIFY COLUMN industry VARCHAR(100) NULL DEFAULT NULL');
    await db.query(`CREATE TABLE IF NOT EXISTS company_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_profile_id INT NOT NULL,
      candidate_id INT NOT NULL,
      application_id INT NOT NULL,
      title VARCHAR(160) NOT NULL,
      narrative TEXT NOT NULL,
      role_title VARCHAR(150) NULL,
      work_mode VARCHAR(80) NULL,
      interview_rating TINYINT UNSIGNED NOT NULL,
      culture_rating TINYINT UNSIGNED NOT NULL,
      communication_rating TINYINT UNSIGNED NOT NULL,
      pros TEXT NULL,
      cons TEXT NULL,
      recommends BOOLEAN NOT NULL DEFAULT FALSE,
      is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
      employer_response TEXT NULL,
      employer_responded_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_company_review_application (company_profile_id, application_id),
      INDEX idx_company_reviews_created (company_profile_id, created_at),
      CONSTRAINT fk_company_reviews_profile FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
      CONSTRAINT fk_company_reviews_candidate FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await db.query('ALTER TABLE company_reviews ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE');
    await db.query(`CREATE TABLE IF NOT EXISTS company_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_profile_id INT NOT NULL,
      asker_id INT NOT NULL,
      question VARCHAR(1000) NOT NULL,
      answer TEXT NULL,
      answered_by INT NULL,
      answered_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_company_questions_created (company_profile_id, created_at),
      CONSTRAINT fk_company_questions_profile FOREIGN KEY (company_profile_id) REFERENCES company_profiles(id) ON DELETE CASCADE,
      CONSTRAINT fk_company_questions_asker FOREIGN KEY (asker_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_company_questions_responder FOREIGN KEY (answered_by) REFERENCES users(id) ON DELETE SET NULL
    )`);
  } catch (error) {
    console.warn('Onboarding step compatibility update skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_summary TEXT NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS company_registration_number VARCHAR(100) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS social_media_urls JSON NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS hiring_volume VARCHAR(50) NULL');
    await db.query('ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS work_email VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS representative_name VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS representative_title VARCHAR(150) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS employer_type VARCHAR(50) NOT NULL DEFAULT \'company\'');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS legalBusinessName VARCHAR(150) NULL');
  } catch (error) {
    console.warn('Company profile save column compatibility update skipped:', error.message);
  }

  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(255) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email'`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE`);
    await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_status ENUM('pending_verification', 'active') NOT NULL DEFAULT 'pending_verification'");
  } catch (error) {
    console.warn('User schema compatibility check skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS job_category VARCHAR(80) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS experience_level VARCHAR(30) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS education_level VARCHAR(80) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(10) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS education JSON NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS skills JSON NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS languages JSON NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS job_preferences JSON NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS job_type VARCHAR(40) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS expected_salary INT NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS work_setup VARCHAR(30) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS raw_cv_text LONGTEXT NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS parsed_json_payload JSON NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS preferred_job_type VARCHAR(40) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS preferred_work_mode VARCHAR(30) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS salary_expectation_min INT NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS salary_expectation_max INT NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(5) DEFAULT \'ETB\'');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS profile_completion_percentage INT DEFAULT 0');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS is_open_to_opportunities BOOLEAN DEFAULT TRUE');
  } catch (error) {
    console.warn('Job seeker profile data columns skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS cv_skipped BOOLEAN NOT NULL DEFAULT FALSE');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS cv_url VARCHAR(255) NULL');
    await db.query("ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS cv_status ENUM('uploaded', 'skipped', 'none') NOT NULL DEFAULT 'none'");
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE');
    await db.query("ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS onboarding_step_completed ENUM('cv_upload', 'manual_profile', 'completed') NOT NULL DEFAULT 'cv_upload'");
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS onboarding_cv_uploaded BOOLEAN NOT NULL DEFAULT FALSE');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE');
  } catch (error) {
    console.warn('Job seeker profile compatibility columns skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS country VARCHAR(100) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS preferred_job_type VARCHAR(40) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS preferred_work_mode VARCHAR(30) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS salary_expectation_min INT NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS salary_expectation_max INT NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(5) NULL');
    await db.query('ALTER TABLE job_seeker_profiles ADD COLUMN IF NOT EXISTS profile_completion_percentage INT DEFAULT 0');
  } catch (error) {
    console.warn('Job seeker profile save schema update skipped:', error.message);
  }

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100) NOT NULL,
      otp_code VARCHAR(10) NOT NULL,
      purpose ENUM('registration', 'login', 'password-reset', 'email-verification') DEFAULT 'registration',
      is_used BOOLEAN DEFAULT FALSE,
      attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      expires_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_expires (email, expires_at)
    )`);
  } catch (error) {
    console.warn('OTP table compatibility check skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10) NULL');
    await db.query("ALTER TABLE otps MODIFY COLUMN purpose ENUM('registration', 'login', 'password-reset', 'email-verification') NOT NULL DEFAULT 'registration'");
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE');
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS attempts TINYINT UNSIGNED NOT NULL DEFAULT 0');
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL DEFAULT NULL');
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    const [otpEmailIndexes] = await db.query(`SELECT COUNT(*) AS count
      FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'otps'
        AND index_name = 'email' AND non_unique = 0`);
    if (otpEmailIndexes[0]?.count > 0) await db.query('ALTER TABLE otps DROP INDEX email');
  } catch (error) {
    console.warn('OTP column migration skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE otps MODIFY COLUMN otp VARCHAR(10) NULL');
  } catch (error) {
    if (!/unknown column|doesn't exist/i.test(error.message)) {
      console.warn('Legacy OTP column compatibility check skipped:', error.message);
    }
  }

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS employers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      companyName VARCHAR(150) NOT NULL,
      legalBusinessName VARCHAR(150),
      tinNumber VARCHAR(50),
      licenseDocumentUrl VARCHAR(255),
      logoUrl VARCHAR(255),
      website VARCHAR(255),
      industry VARCHAR(100),
      companySize VARCHAR(50) DEFAULT '11-50',
      location VARCHAR(150),
      phoneNumber VARCHAR(20),
      phoneOperator VARCHAR(30),
      verificationStatus ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_userId (userId),
      INDEX idx_verificationStatus (verificationStatus)
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS talent_pool (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employerId INT NOT NULL,
      candidateId INT NOT NULL,
      candidateName VARCHAR(150) NOT NULL,
      primaryRole VARCHAR(150),
      skills JSON,
      aiMatchScore DECIMAL(5,2) DEFAULT 0,
      notes TEXT,
      savedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (candidateId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_saved_candidate (employerId, candidateId),
      INDEX idx_employerId (employerId)
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS employer_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      emailAlerts BOOLEAN DEFAULT TRUE,
      matchingAlerts BOOLEAN DEFAULT TRUE,
      weeklyDigest BOOLEAN DEFAULT FALSE,
      notificationEmail VARCHAR(150),
      teamPermissions JSON,
      workspacePreferences JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await db.query('ALTER TABLE employer_settings ADD COLUMN IF NOT EXISTS workspacePreferences JSON NULL');

    await db.query(`CREATE TABLE IF NOT EXISTS employer_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employerId INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      body TEXT NOT NULL,
      isRead BOOLEAN DEFAULT FALSE,
      related_job_id INT NULL,
      related_application_id INT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employerId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_employer_read (employerId, isRead)
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS employer_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employerId INT NOT NULL,
      candidateId INT NOT NULL,
      subject VARCHAR(200),
      body TEXT NOT NULL,
      isRead BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (candidateId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_employer_messages (employerId, candidateId, isRead)
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS offers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      applicationId INT NOT NULL UNIQUE,
      employerId INT NOT NULL,
      candidateId INT NOT NULL,
      offeredSalary DECIMAL(12,2),
      startDate DATE,
      offerLetterUrl VARCHAR(255),
      status ENUM('draft', 'sent', 'accepted', 'declined') DEFAULT 'draft',
      sentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (employerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (candidateId) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_offers_employer (employerId)
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      candidateId INT NOT NULL,
      employerId INT NOT NULL,
      taskTitle VARCHAR(200) NOT NULL,
      isCompleted BOOLEAN DEFAULT FALSE,
      documentUrl VARCHAR(255),
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (candidateId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (employerId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_candidate_task (candidateId, taskTitle),
      INDEX idx_onboarding_employer (employerId, isCompleted)
    )`);
  } catch (error) {
    console.warn('Employer compatibility tables check skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_type VARCHAR(40) NULL');
    await db.query('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id INT NULL');
  } catch (error) {
    console.warn('Notification reference compatibility check skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS phoneNumber VARCHAR(20) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS phoneOperator VARCHAR(30) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS representative_name VARCHAR(255) NULL');
    await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  } catch (error) {
    console.warn('Employer phone compatibility check skipped:', error.message);
  }

  try {
    await db.query("ALTER TABLE user_activity_log MODIFY COLUMN activity_type ENUM('login', 'profile-update', 'job-view', 'job-apply', 'profile-view', 'message-sent', 'cv-upload', 'role_selected') NOT NULL");
  } catch (error) {
    console.warn('Activity log migration skipped:', error.message);
  }

  const requiredJobColumns = [
    'sector', 'sub_sectors', 'currency', 'education_qualification', 'salary_period',
    'is_salary_negotiable', 'deadline', 'state_province', 'status', 'is_active',
    'reviewed_by', 'reviewed_at',
  ];
  const [jobColumns] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs'`,
  );
  const availableJobColumns = new Set(jobColumns.map(({ COLUMN_NAME: name }) => name));
  const missingJobColumns = requiredJobColumns.filter((column) => !availableJobColumns.has(column));
  if (missingJobColumns.length) {
    throw new Error(`The jobs table is missing required canonical columns: ${missingJobColumns.join(', ')}.`);
  }
  await db.query('ALTER TABLE employers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE');
};

const ADMIN_EMAILS = new Set(['tekebaaweke32@gmail.com', 'yabsirademeke07@gmail.com']);

const resolveEffectiveRole = (role, email) => {
  const targetEmail = String(email || '').trim().toLowerCase();
  if (ADMIN_EMAILS.has(targetEmail)) return 'admin';
  const value = String(role || 'job_seeker').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (value === 'superadmin') return 'super_admin';
  const safeRoles = ['super_admin', 'admin', 'employer', 'job_seeker'];
  return safeRoles.includes(value) ? value : 'job_seeker';
};

const sanitizeUser = (user = {}) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone || null,
  role: resolveEffectiveRole(user.role, user.email),
  isAdmin: ['admin', 'super_admin'].includes(resolveEffectiveRole(user.role, user.email)),
  isSuperAdmin: ADMIN_EMAILS.has(String(user.email || '').trim().toLowerCase()),
  is_verified: Boolean(user.is_verified),
  isEmailVerified: Boolean(user.is_verified),
  authStatus: user.auth_status || (user.is_verified ? 'active' : 'pending_verification'),
  is_active: user.is_active !== false,
  google_id: user.google_id || null,
  auth_provider: user.auth_provider || 'email',
  avatar_url: user.avatar_url || user.profile_picture_url || null,
  profile_picture_url: user.avatar_url || user.profile_picture_url || null,
});

const normalizeRole = (role) => {
  const value = String(role || 'job_seeker').trim().toLowerCase();
  const safeRoles = ['super_admin', 'admin', 'employer', 'job_seeker'];
  return safeRoles.includes(value) ? value : 'job_seeker';
};

// ==========================================
// ⚙️ MULTER FILE UPLOAD SETUP
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cvs/');
  },
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = crypto.randomUUID();
      const ext = path.extname(file.originalname || '.pdf');
      cb(null, `cv-${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimeOk = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ].includes(file.mimetype);

    if (allowedExt.includes(ext) && mimeOk) {
      return cb(null, true);
    }

    cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed.'));
  },
});

const reportEvidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, reportUploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = crypto.randomUUID();
      cb(null, `report-${uniqueSuffix}${path.extname(file.originalname || '').toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedFiles = new Map([['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'], ['.webp', 'image/webp'], ['.pdf', 'application/pdf']]);
    const extension = path.extname(file.originalname || '').toLowerCase();
    const allowed = allowedFiles.get(extension) === file.mimetype;
    cb(allowed ? null : new Error('Evidence must be a JPG, PNG, WebP, or PDF file.'), allowed);
  },
});
const handleReportEvidenceUpload = (req, res, next) => reportEvidenceUpload.single('evidence')(req, res, (error) => {
  if (error) return res.status(400).json({ success: false, message: error.message || 'Evidence upload failed.' });
  return next();
});

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      ...decoded,
      role: resolveEffectiveRole(decoded.role, decoded.email),
    };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const requireAdmin = async (req, res, next) => {
  if (req.adminAuthorized) return next();
  const userId = req.user?.id || req.user?.userId || req.user?.user_id || req.user?.sub;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authenticated user id is missing.' });
  }

  try {
    const [users] = await db.execute(
      'SELECT id, email, role, is_active FROM users WHERE id = ? LIMIT 1',
      [userId],
    );
    const user = users[0];
    if (!user || [false, 0, '0'].includes(user.is_active)) {
      return res.status(403).json({ success: false, message: 'Active admin access is required.' });
    }

    const role = resolveEffectiveRole(user.role, user.email);
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    req.user = { ...req.user, id: user.id, email: user.email, role };
    req.adminAuthorized = true;
    return next();
  } catch (error) {
    console.error('Admin authorization lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify admin access.' });
  }
};

const adminController = require('./controllers/adminController');

app.post('/api/reports', authenticateUser, handleReportEvidenceUpload, adminController.createReport);
app.use('/api/admin', authenticateUser, requireAdmin);
app.post('/api/jobs/sync-to-channel', authenticateUser, requireAdmin, async (_req, res) => {
  try {
    const summary = await syncActiveJobsToPublicChannel();
    return res.status(summary.failed ? 502 : 200).json({
      success: summary.failed === 0,
      message: summary.failed
        ? 'Some eligible jobs could not be broadcast. Retry the sync to deliver the remaining announcements.'
        : 'All active jobs were synchronized to the public Telegram channel.',
      ...summary,
    });
  } catch (error) {
    console.error('Active job Telegram channel sync failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to synchronize active jobs to Telegram.' });
  }
});
app.get('/api/admin/overview', authenticateUser, requireAdmin, adminController.getAdminDashboardData);
app.get('/api/admin/dashboard-stats', authenticateUser, requireAdmin, adminController.getAdminDashboardStats);
app.get('/api/admin/activity-logs', authenticateUser, requireAdmin, adminController.getAdminActivityLogs);
app.patch('/api/admin/companies/:companyId/verify', authenticateUser, requireAdmin, adminController.verifyCompany);
app.patch('/api/admin/company/:id/verify', authenticateUser, requireAdmin, adminController.updateVerificationStatus);
app.get('/api/admin/companies', authenticateUser, requireAdmin, adminController.getPendingCompanies);
app.get('/api/admin/reports', authenticateUser, requireAdmin, adminController.getAdminReports);
app.get('/api/admin/reports/:id/messages', authenticateUser, requireAdmin, adminController.getReportMessages);
app.post('/api/admin/reports/:id/resolve', authenticateUser, requireAdmin, adminController.resolveAdminReport);
app.post('/api/admin/reports/:id/reply', authenticateUser, requireAdmin, adminController.replyToReport);
app.get('/api/admin/jobs', authenticateUser, requireAdmin, adminController.getAllJobsForModeration);
app.get('/api/admin/jobs/:id/preview', authenticateUser, requireAdmin, adminController.getJobPreview);
app.patch('/api/admin/users/:userId/status', authenticateUser, requireAdmin, adminController.toggleUserStatus);
app.patch('/api/admin/jobs/:jobId/status', authenticateUser, requireAdmin, adminController.toggleJobStatus);
app.patch('/api/admin/jobs/:id/moderate', authenticateUser, requireAdmin, adminController.toggleJobStatus);
app.post('/api/admin/jobs/:id/moderate', authenticateUser, requireAdmin, adminController.moderateJob);
app.post('/api/admin/jobs/:id/approve', authenticateUser, requireAdmin, (req, res) => {
  req.body = { ...req.body, action: 'approve' };
  return adminController.moderateJob(req, res);
});
app.patch('/api/admin/reports/:id/status', authenticateUser, requireAdmin, adminController.updateReportStatus);
app.delete('/api/admin/jobs/:id', authenticateUser, requireAdmin, adminController.deleteJob);

app.get('/api/seeker/profile-status', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      `SELECT cv_url, cv_status, cv_skipped, onboarding_step, onboarding_step_completed, profile_completed, is_profile_complete
       FROM job_seeker_profiles
       WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    const profile = rows[0] || {};
    const cvStatus = ['uploaded', 'skipped', 'none'].includes(profile.cv_status)
      ? profile.cv_status
      : (profile.cv_url ? 'uploaded' : (Boolean(Number(profile.cv_skipped)) ? 'skipped' : 'none'));
    const cvSkipped = cvStatus === 'skipped';
    const onboardingStep = String(profile.onboarding_step || 'cv_upload').trim();
    const profileCompleted = Boolean(profile.is_profile_complete || profile.profile_completed || Number(profile.is_profile_complete) === 1 || Number(profile.profile_completed) === 1);

    return res.json({
      success: true,
      cv_url: profile.cv_url || null,
      cv_status: cvStatus,
      cv_skipped: cvSkipped,
      onboarding_step: onboardingStep,
      onboarding_step_completed: profile.onboarding_step_completed || (profileCompleted ? 'completed' : (cvSkipped ? 'manual_profile' : 'cv_upload')),
      profile_completed: profileCompleted,
    });
  } catch (error) {
    console.error('Seeker profile status fetch error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch profile status.',
    });
  }
});

app.put('/api/seeker/onboarding-step', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const payload = req.body || {};
  const onboardingStep = String(payload.onboarding_step || 'personal_info').trim();
  const cvSkipped = payload.cv_skipped === true || payload.cv_skipped === 'true' || payload.cv_skipped === 1 || payload.cv_skipped === '1';
  const cvStatus = cvSkipped ? 'skipped' : (payload.cv_status === 'uploaded' ? 'uploaded' : 'none');
  const onboardingStepCompleted = cvSkipped ? 'manual_profile' : (payload.onboarding_step_completed || (onboardingStep === 'completed' ? 'completed' : 'cv_upload'));

  try {
    await db.query(
      `INSERT INTO job_seeker_profiles (user_id, cv_status, cv_skipped, onboarding_step, onboarding_step_completed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE cv_status = VALUES(cv_status), cv_skipped = VALUES(cv_skipped), onboarding_step = VALUES(onboarding_step), onboarding_step_completed = VALUES(onboarding_step_completed)`,
      [userId, cvStatus, cvSkipped ? 1 : 0, onboardingStep, onboardingStepCompleted]
    );
    await db.query(
      `UPDATE users SET cv_status = ?, onboarding_step_completed = ?, onboarding_step = ? WHERE id = ?`,
      [cvStatus, onboardingStepCompleted, onboardingStep, userId]
    );

    return res.json({
      success: true,
      cv_status: cvStatus,
      cv_skipped: cvSkipped,
      onboarding_step: onboardingStep,
      onboarding_step_completed: onboardingStepCompleted,
      message: 'Onboarding step saved.',
    });
  } catch (error) {
    console.error('Seeker onboarding-step sync error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save onboarding progress.',
    });
  }
});

app.put('/api/seeker/profile', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const profile = req.body || {};
  const completion = Math.max(0, Math.min(100, Number(profile.completionPercentage) || 0));
  const salaryRange = String(profile.salaryExpectation || '')
    .replace(/,/g, '')
    .match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)/i);
  const parseSalaryAmount = (value) => {
    const match = String(value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
    const amount = match ? Number(match[0]) : NaN;
    return Number.isFinite(amount) && amount > 0 && amount <= 2147483647
      ? Math.round(amount)
      : null;
  };
  const salaryMinimum = parseSalaryAmount(profile.expectedSalary ?? salaryRange?.[1] ?? profile.salaryExpectation);
  const salaryMaximum = parseSalaryAmount(profile.expectedSalaryMax ?? salaryRange?.[2]);

  const normalizeWorkSetup = (value) => {
    const normalized = String(value || 'hybrid').trim().toLowerCase();
    if (!normalized || normalized === 'hybrid') return 'hybrid';
    if (normalized === 'any / flexible' || normalized === 'any/flexible' || normalized === 'any flexible' || normalized === 'flexible' || normalized === 'any') return 'any';
    if (normalized === 'on-site' || normalized === 'on site' || normalized === 'onsite') return 'on-site';
    if (normalized === 'remote') return 'remote';
    return 'hybrid';
  };

  let connection;
  let transactionStarted = false;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.execute(
      `INSERT INTO job_seeker_profiles
         (user_id, headline, bio, location, country, city, preferred_work_mode,
          salary_expectation_min, salary_expectation_max, expected_salary,
          profile_completion_percentage, profile_completed, is_profile_complete,
          cv_status, onboarding_step, onboarding_step_completed, job_category,
          experience_level, job_type, skills, education_level, education, languages,
          parsed_json_payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', 'personal_info', ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         headline = VALUES(headline), bio = VALUES(bio), location = VALUES(location),
         country = VALUES(country), city = VALUES(city), preferred_work_mode = VALUES(preferred_work_mode),
         salary_expectation_min = VALUES(salary_expectation_min),
         salary_expectation_max = VALUES(salary_expectation_max),
         expected_salary = VALUES(expected_salary),
         profile_completion_percentage = VALUES(profile_completion_percentage),
         profile_completed = VALUES(profile_completed), is_profile_complete = VALUES(is_profile_complete),
         onboarding_step = 'personal_info',
         onboarding_step_completed = VALUES(onboarding_step_completed),
         job_category = COALESCE(VALUES(job_category), job_category),
         experience_level = VALUES(experience_level), job_type = VALUES(job_type),
         skills = COALESCE(VALUES(skills), skills),
         education_level = COALESCE(VALUES(education_level), education_level),
         education = COALESCE(VALUES(education), education),
         languages = COALESCE(VALUES(languages), languages),
         parsed_json_payload = COALESCE(VALUES(parsed_json_payload), parsed_json_payload)`,
      [
        userId,
        profile.preferredJob || profile.desiredPosition || profile.jobPreference || null,
        profile.bio || null,
        profile.city || profile.preferredCity || null,
        profile.country || null,
        profile.city || null,
        normalizeWorkSetup(profile.preferredWorkSetup || profile.workSetup),
        salaryMinimum,
        salaryMaximum,
        salaryMinimum,
        completion,
        completion === 100,
        completion === 100,
        completion === 100 ? 'completed' : 'manual_profile',
        profile.jobCategory || null,
        profile.experienceLevel || null,
        profile.jobType || profile.employmentType || null,
        Array.isArray(profile.skills) ? JSON.stringify(profile.skills) : null,
        profile.educationLevel || null,
        Array.isArray(profile.education) ? JSON.stringify(profile.education) : null,
        Array.isArray(profile.languages) ? JSON.stringify(profile.languages) : null,
        JSON.stringify(profile),
      ]
    );
    await connection.execute(
      `UPDATE users
       SET full_name = COALESCE(NULLIF(?, ''), full_name),
           email = COALESCE(NULLIF(?, ''), email),
           phone = COALESCE(NULLIF(?, ''), phone),
           is_profile_complete = ?, onboarding_step_completed = ?,
           onboarding_step = ?, onboarding_completed = TRUE,
           seeker_onboarded = (seeker_onboarded OR ?)
       WHERE id = ?`,
      [
        String(profile.fullName || profile.full_name || '').trim(),
        String(profile.email || '').trim(),
        String(profile.phone || '').trim(),
        completion === 100,
        completion === 100 ? 'completed' : 'manual_profile',
        'personal_info',
        completion === 100,
        userId,
      ]
    );
    await connection.commit();
    transactionStarted = false;
    return res.json({ success: true, profileCompletionPercentage: completion });
  } catch (error) {
    if (connection && transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Seeker profile save rollback failed:', rollbackError);
      }
    }
    console.error('Save Seeker Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save personal information.' });
  } finally {
    connection?.release();
  }
});


// ==========================================
//  CV UPLOAD API
// ==========================================
app.post(['/api/cvs', '/api/seeker/upload-cv'], authenticateUser, upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a CV file.' });
  }

  try {
    await db.query('UPDATE cvs SET is_primary = FALSE WHERE user_id = ?', [req.user.id]);
    const fileUrl = `/uploads/cvs/${req.file.filename}`;
    const [result] = await db.query(
      'INSERT INTO cvs (user_id, file_name, file_url, file_size, mime_type, is_primary, is_active) VALUES (?, ?, ?, ?, ?, TRUE, TRUE)',
      [req.user.id, req.file.originalname, fileUrl, req.file.size, req.file.mimetype]
    );
    await db.query(
      `INSERT INTO job_seeker_profiles (user_id, cv_url, cv_status, cv_skipped, onboarding_step, onboarding_step_completed)
       VALUES (?, ?, 'uploaded', FALSE, 'personal_info', 'manual_profile')
       ON DUPLICATE KEY UPDATE cv_url = VALUES(cv_url), cv_status = 'uploaded', cv_skipped = FALSE, onboarding_step = 'personal_info', onboarding_step_completed = 'manual_profile'`,
      [req.user.id, fileUrl]
    );
    await db.query(
      `UPDATE users SET cv_url = ?, cv_status = 'uploaded', onboarding_step = 'personal_info', onboarding_step_completed = 'manual_profile' WHERE id = ?`,
      [fileUrl, req.user.id]
    );

    return res.status(201).json({
      success: true,
      cv: { id: result.insertId, fileName: req.file.originalname, fileUrl }
    });
  } catch (error) {
    console.error('CV Upload Error:', error);
    return res.status(500).json({ message: 'Unable to save your CV.' });
  }
});

// ==========================================
// 💡 HELPER: Smart Skill Matching Engine
// ==========================================
function calculateRealMatch(seekerSkills = '', requiredSkills = '') {
  let reqArray = Array.isArray(requiredSkills)
    ? requiredSkills
    : (requiredSkills || '').split(',').map(s => s.trim());

  return reqArray.length;
}

// ==========================================
// 📩 1. SEND OTP API
// ==========================================
app.post('/api/send-otp', async (req, res) => {
  console.log('🚀 [OTP DEBUG] Received request:', {
    path: req.originalUrl,
    bodyKeys: Object.keys(req.body || {}),
    emailDefined: Boolean(req.body?.email),
  });
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const [rows] = await db.query('SELECT id, phone FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const otpResult = await issueOtp({
      dbClient: db,
      email: normalizedEmail,
      phone: rows[0].phone,
      purpose: 'registration',
      expiresInMinutes: 1,
    });
    const response = {
      success: true,
      message: 'OTP sent.',
      emailDelivered: otpResult.delivery.email,
      emailError: otpResult.delivery.emailError,
    };
    if (process.env.NODE_ENV === 'development') response.devOtp = otpResult.otpCode;
    if (!otpResult.delivery.email) {
      return res.status(200).json({
        success: true,
        emailDelivered: false,
        emailError: otpResult.delivery.emailError,
        message: otpResult.delivery.emailError || 'Email delivery failed. Check the backend SMTP configuration and server logs, then try again.',
        ...(process.env.NODE_ENV === 'development' ? { devOtp: otpResult.otpCode } : {}),
      });
    }
    return res.json(response);
  } catch (error) {
    console.error('❌ [OTP REQUEST ERROR]:', error);
    if (error.code === 'OTP_RATE_LIMITED') {
      return res.status(429).json({ success: false, error: error.message });
    }
    return res.status(500).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
    });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const enteredOtp = String(req.body.otp_code || req.body.otp || '').trim();

  try {
    const [rows] = await db.query(
      `SELECT * FROM otps
       WHERE email = ? AND is_used = 0
       ORDER BY id DESC LIMIT 1`,
      [cleanEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active verification code found. Please request a new code.'
      });
    }

    const otpRecord = rows[0];
    if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
      await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({
        success: false,
        error: 'This OTP code has expired. Please request a new one.'
      });
    }

    if (Number(otpRecord.attempts || 0) >= 4) {
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts. For your security, please wait 15 minutes before requesting a new code.'
      });
    }

    if (String(otpRecord.otp_code).trim() !== enteredOtp) {
      const nextAttempts = Number(otpRecord.attempts || 0) + 1;
      await db.query('UPDATE otps SET attempts = ? WHERE id = ?', [nextAttempts, otpRecord.id]);
      const remaining = 4 - nextAttempts;

      if (remaining <= 0) {
        return res.status(429).json({
          success: false,
          error: 'Too many failed attempts. Please wait 15 minutes before trying again.'
        });
      }

      return res.status(400).json({
        success: false,
        error: `Invalid OTP code. You have ${remaining} attempt(s) remaining.`
      });
    }

    await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);
    await db.query(
      "UPDATE users SET is_verified = TRUE, auth_status = 'active'" + (selectedRole ? ', role = ?' : '') + ' WHERE email = ?',
      selectedRole ? [selectedRole, cleanEmail] : [cleanEmail]
    );
    const [verifiedUsers] = await db.query(
      'SELECT id, full_name, email, phone, role, is_verified, is_active, profile_picture_url FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );
    const verifiedUser = verifiedUsers[0];
    const sessionUser = sanitizeUser(verifiedUser);
    const isAdmin = ['admin', 'super_admin'].includes(sessionUser.role);
    const token = jwt.sign(
      { id: sessionUser.id, email: sessionUser.email, role: isAdmin ? 'admin' : sessionUser.role, isAdmin },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      token,
      user: sessionUser,
      requiresRoleSelection: !isAdmin,
      onboarding_step: isAdmin ? null : 'role_selection',
      redirect_to: isAdmin ? '/admin/dashboard' : '/select-role',
    });
  } catch (dbErr) {
    console.error('DB Verification Error:', dbErr);
    return res.status(500).json({ success: false, message: 'Unable to verify OTP at this time.' });
  }
});

// ==========================================
// 3. USER REGISTRATION API (Unified & Safe)
// ==========================================
app.post('/api/register', validateSignUp, async (req, res) => {
  console.log('➡️ Registration Payload Received:', req.body);

  const { full_name, fullName, email, password, phone, phoneNumber, role } = req.body;
  const userFullName = (full_name || fullName || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const userPhone = phone || phoneNumber || null;
  const selectedRole = ADMIN_EMAILS.has(normalizedEmail)
    ? 'admin'
    : (role === 'employer' || role === 'job_seeker' ? role : 'job_seeker');

  if (!userFullName) {
    return res.status(400).json({ message: 'Full Name is missing / ሙሉ ስም አልተገኘም' });
  }
  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Email is missing / ኢሜይል አልተገኘም' });
  }
  if (!password) {
    return res.status(400).json({ message: 'Password is missing / የይለፍ ቃል አልተገኘም' });
  }

  try {
    const [existingUsers] = await db.query('SELECT id, is_verified FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.is_verified === 1 || existingUser.is_verified === true) {
        return res.status(409).json({
          success: false,
          isAlreadyVerified: true,
          message: 'ይህ ኢሜይል አስቀድሞ ተመዝግቧል። እባክዎ በቀጥታ ይግቡ (Email is already registered. Please login).'
        });
      }

      await db.query(
        "UPDATE users SET full_name = ?, phone = ?, password = ?, role = ?, is_verified = FALSE, auth_status = 'pending_verification', is_active = TRUE WHERE id = ?",
        [userFullName, userPhone || null, hashedPassword, selectedRole, existingUser.id]
      );
      await db.query('UPDATE otps SET is_used = TRUE WHERE email = ? AND is_used = FALSE', [normalizedEmail]);

      const otpResult = await issueOtp({ dbClient: db, email: normalizedEmail, phone: userPhone, purpose: 'registration' });

      return res.status(201).json({
        success: true,
        requiresVerification: true,
        email: normalizedEmail,
        role: selectedRole,
        userId: existingUser.id,
        message: 'ያልተጠናቀቀ ምዝገባ ተገኝቷል። አዲስ የማረጋገጫ ኮድ ተልኳል።',
        ...(process.env.NODE_ENV === 'development' ? { devOtp: otpResult.otpCode } : {}),
      });
    }

    const passwordMatches = await bcrypt.compare(String(password), String(user.password || ''));
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email with the OTP before logging in.'
      });
    }

    const resolvedRole = resolveEffectiveRole(user.role, user.email);
    if (resolvedRole !== user.role) {
      await db.query('UPDATE users SET role = ? WHERE id = ?', [resolvedRole, user.id]);
      user.role = resolvedRole;
    }

    const otpResult = await issueOtp({ dbClient: db, email: normalizedEmail, phone: user.phone, purpose: 'login', expiresInMinutes: 1 });

    return res.status(200).json({
      success: true,
      requires_otp: true,
      email: normalizedEmail,
      message: 'OTP verification code sent to your email.',
      ...(process.env.NODE_ENV === 'development' ? { devOtp: otpResult.otpCode } : {}),
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login endpoint error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Login failed.' });
  }
});

app.post('/api/cvs', authenticateUser, upload.single('cv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'CV file is required.' });
  }

  try {
    const [userRows] = await db.query('SELECT id, email, phone FROM users WHERE email = ?', [normalizedEmail]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found / መለያ አልተገኘም' });
    }

    const otpResult = await issueOtp({ dbClient: db, email: normalizedEmail, phone: userRows[0].phone, purpose: 'login' });
    const { delivery } = otpResult;

    return res.status(200).json({
      success: true,
      delivery: { emailSent: delivery.email, smsSent: delivery.sms },
      emailDelivered: delivery.email,
      emailError: delivery.emailError,
      message: delivery.email ? 'OTP sent to your email.' : delivery.emailError,
      ...(process.env.NODE_ENV === 'development' ? { devOtp: otpResult.otpCode } : {}),
    });
  } catch (error) {
    console.error('Send Login OTP Error:', error);
    if (error.code === 'OTP_RATE_LIMITED') {
      return res.status(429).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message || 'Unable to send OTP.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api', seekerMatchingRoutes);
app.use('/api/job-seekers', jobSeekerRoutes);
app.use('/api/seeker', jobSeekerRoutes);
app.use('/api/profile', profileRoutes);
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error.' });
});

// ==========================================
// 5. CREATE JOB API
// ==========================================
app.post('/api/jobs', authenticateUser, async (req, res) => {
  console.log('--> [FULL PAYLOAD RECEIVED]:', JSON.stringify(req.body, null, 2));

  try {
    const employerId = req.user?.id || req.user?.userId || null;
    const data = req.body || {};

    const title = String(data.title || data.jobTitle || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, error: 'Job title is required.' });
    }

    const employerRole = (req.user.role || '').toLowerCase().trim();
    if (employerRole !== 'employer') {
      return res.status(403).json({ success: false, error: 'Only employers can post jobs.' });
    }

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

    const normalizeOptionalBoolean = (value, fallback = false) => {
      if (value === null || value === undefined || value === '') return fallback;
      if (typeof value === 'string') return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
      return Boolean(value);
    };

    const normalizeOptionalDate = (value) => {
      const text = normalizeNullableText(value);
      return text && text.length >= 8 ? text : null;
    };
    const normalizeJobDeadline = (value) => {
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

    let companyName = normalizeNullableText(data.companyName || data.company_name || data.company || null);
    if (!companyName) {
      try {
        const [empRows] = await db.query(
          'SELECT company_name, representative_name FROM employers WHERE user_id = ? LIMIT 1',
          [employerId]
        );
        companyName =
          normalizeNullableText(empRows?.[0]?.company_name) ||
          normalizeNullableText(empRows?.[0]?.representative_name) ||
          null;
      } catch (error) {
        console.warn('Could not load company_name, using fallback:', error.message);
      }
    }
    if (!companyName) {
      return res.status(400).json({ success: false, error: 'company_name is required and cannot be null' });
    }

    const sector = normalizeNullableText(data.sector || data.category || data.department || data.sectorName) || 'General';
    const subSectors = normalizeSubSectors(data.sub_sectors ?? data.subSectors);
    if (!subSectors || subSectors.length > 4) {
      return res.status(400).json({ success: false, message: 'Select up to 4 valid sub-sectors.' });
    }
    const jobType = normalizeNullableText(data.jobType || data.job_type || data.jobTypeName || 'full-time') || 'full-time';
    const workMode = normalizeNullableText(data.workMode || data.work_mode || data.workplaceType || 'hybrid') || 'hybrid';
    const location = normalizeNullableText(data.location || data.locationValue || data.city || 'Addis Ababa') || 'Addis Ababa';
    const stateProvince = normalizeNullableText(data.state_province || data.stateProvince) || null;
    const workAddress = normalizeNullableText(data.work_address || data.workAddress || data.workLocation);
    const genderPreference = normalizeNullableText(data.genderPreference || data.gender_preference || data.gender || 'any') || 'any';
    const currency = normalizeNullableText(data.currency || data.compensation_currency) || 'ETB';
    const salaryPeriod = (() => {
      const raw = String(data.salary_period ?? data.salaryPeriod ?? data.salary_type ?? data.salaryType ?? 'monthly').trim().toLowerCase();
      return ['hourly', 'monthly', 'yearly'].includes(raw) ? raw : 'monthly';
    })();
    const salaryMin = normalizeOptionalNumber(data.minimumSalary ?? data.salaryMin ?? data.salary_min ?? data.salaryMinimum);
    const salaryMax = normalizeOptionalNumber(data.maximumSalary ?? data.salaryMax ?? data.salary_max ?? data.salaryMaximum);
    const isSalaryNegotiable = normalizeOptionalBoolean(data.is_negotiable ?? data.is_salary_negotiable ?? true);
    const vacancies = normalizeOptionalNumber(data.vacancies) ?? 1;
    const educationQualification = normalizeNullableText(data.education_qualification || data.educationQualification || data.required_education || data.requiredEducation || data.education) || "Bachelor's Degree";
    const benefits = normalizeNullableText(data.benefits);
    const deadlineValue = data.deadline || data.applicationDeadline || data.application_deadline;
    const deadline = normalizeJobDeadline(deadlineValue);
    if (deadlineValue && !deadline) {
      return res.status(400).json({ success: false, message: 'Provide a valid application deadline in YYYY-MM-DD format.' });
    }
    if (deadline && deadline < new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ success: false, message: 'Application deadline must be today or a future date.' });
    }
    const scheduledDate = normalizeOptionalDate(
      data.scheduledDate || data.scheduled_date || data.scheduledAt || data.scheduled_at
    );
    const requiredSkillsRaw = data.requiredSkills ?? data.required_skills ?? data.skills;
    const requiredSkills = Array.isArray(requiredSkillsRaw)
      ? requiredSkillsRaw.join(', ')
      : normalizeNullableText(requiredSkillsRaw);
    const description = normalizeNullableText(data.description || data.jobDescription || data.fullDescription) || null;
    const status = 'draft';
    const approvalStatus = 'pending';
    const isApproved = false;
    const isActive = false;
    const viewCount = normalizeOptionalNumber(data.view_count) ?? 0;

    const insertSql = `
      INSERT INTO jobs (
        employer_id,
        company_name,
        title,
        description,
        sector,
        sub_sectors,
        job_type,
        experience_level,
        work_mode,
        location,
        state_province,
        work_address,
        gender_preference,
        salary_min,
        salary_max,
        currency,
        salary_period,
        is_salary_negotiable,
        vacancies,
        required_skills,
        education_qualification,
        benefits,
        deadline,
        scheduled_date,
        is_urgent,
        status,
        approval_status,
        is_approved,
        is_active,
        view_count,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      employerId,
      companyName,
      title,
      description,
      sector,
      JSON.stringify(subSectors),
      jobType,
      normalizeNullableText(data.experience_level || data.experienceLevel || 'mid-level') || 'mid-level',
      workMode,
      location,
      stateProvince,
      workAddress,
      genderPreference,
      salaryMin,
      salaryMax,
      currency,
      salaryPeriod,
      isSalaryNegotiable,
      vacancies,
      requiredSkills,
      educationQualification,
      benefits,
      deadline,
      scheduledDate,
      Boolean(data.is_urgent || data.isUrgent),
      status,
      approvalStatus,
      isApproved,
      isActive,
      viewCount,
    ];

    const [insertResult] = await db.query(insertSql, params);
    console.log(`--> [SUCCESSFULLY STORED TO MYSQL] Job ID: ${insertResult.insertId}`);
    console.log(`--> Stored values: Title="${title}", Sector="${sector}", Vacancy="${vacancies}", Salary="${salaryMin ?? ''}-${salaryMax ?? ''} ${currency}", Location="${location}"`);

    return res.status(201).json({
      success: true,
      jobId: insertResult.insertId,
      status,
      message: 'Job submitted for admin approval.'
    });
  } catch (error) {
    const sqlMessage = error?.sqlMessage || error?.message || 'Unknown database error';
    console.error('--> [FATAL MYSQL ERROR ON JOB INSERT]:', sqlMessage);
    console.error(error);
    return res.status(500).json({
      success: false,
      error: `Database save failed: ${sqlMessage}`
    });
  }
});

const handleJobStatusUpdate = async (req, res) => {
  const jobId = String(req.params.id || '').trim();
  const employerId = req.user?.id || req.user?.userId || req.user?.user_id || null;
  const rawStatus = String(req.body?.status || '').trim();
  const cleanStatus = rawStatus.toLowerCase();
  const role = String(req.user?.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const isSuperAdmin = role === 'super_admin';

  console.log(`--> [JOB STATUS UPDATE] Job ID: ${jobId} | Target Status: "${rawStatus}" | Employer ID: ${employerId}`);

  if (!jobId) {
    return res.status(400).json({ success: false, error: 'Job ID is required.' });
  }

  if (!rawStatus) {
    return res.status(400).json({ success: false, error: 'Status field is required.' });
  }

  const allowedStatuses = ['active', 'paused', 'closed', 'draft', 'published', 'scheduled', 'pending_approval', 'expired'];
  if (!allowedStatuses.includes(cleanStatus)) {
    return res.status(400).json({ success: false, error: `Invalid status: ${rawStatus}` });
  }
  if (!employerId) return res.status(401).json({ success: false, error: 'Employer authentication is required.' });
  const requestedScheduledAt = req.body?.scheduledAt || req.body?.scheduledDate || req.body?.scheduled_date || null;
  const isScheduling = cleanStatus === 'scheduled'
    || Boolean(requestedScheduledAt && new Date(requestedScheduledAt).getTime() > Date.now());
  const isPublishing = ['published', 'active', 'pending_approval'].includes(cleanStatus) || isScheduling;
  const canonicalStatus = isPublishing && !isSuperAdmin ? 'pending'
    : isScheduling ? 'published'
      : isPublishing && isSuperAdmin ? 'active'
        : cleanStatus === 'pending_approval' ? 'pending' : cleanStatus;

  try {
    const ownerClause = isSuperAdmin ? '' : ' AND employer_id = ?';
    const ownerParams = isSuperAdmin ? [jobId] : [jobId, employerId];
    const [[previousJob]] = await db.query(
      `SELECT status, approval_status, is_approved, approved_by, approved_at, is_active, scheduled_date, published_at
       FROM jobs WHERE id = ?${ownerClause} LIMIT 1`,
      ownerParams,
    );
    if (!previousJob) return res.status(404).json({ success: false, error: 'Job listing not found.' });
    const wasPubliclyAvailable = String(previousJob.approval_status || '').toLowerCase() === 'approved'
      && ['active', 'published'].includes(String(previousJob.status || '').toLowerCase())
      && [true, 1, '1'].includes(previousJob.is_active);

    const needsReview = isPublishing && !isSuperAdmin;
    const approvalStatus = needsReview ? 'pending'
      : isPublishing && isSuperAdmin ? 'approved' : previousJob.approval_status || 'pending';
    const isApproved = needsReview ? false
      : isPublishing && isSuperAdmin ? true : Boolean(previousJob.is_approved);
    const isActive = isPublishing && isSuperAdmin ? true
      : isPublishing ? false
      : canonicalStatus === 'active' && approvalStatus === 'approved';
    const approvedBy = needsReview ? null
      : isPublishing && isSuperAdmin ? employerId : previousJob.approved_by;
    const approvedAt = needsReview ? null
      : isPublishing && isSuperAdmin ? new Date() : previousJob.approved_at;
    const scheduledDate = isScheduling
      ? requestedScheduledAt || previousJob.scheduled_date || new Date()
      : isPublishing || ['paused', 'closed', 'expired'].includes(canonicalStatus) ? null : previousJob.scheduled_date;
    const publishedAt = isPublishing && isSuperAdmin && !isScheduling
      ? previousJob.published_at || new Date()
      : isPublishing ? null : canonicalStatus === 'draft' ? null : previousJob.published_at;
    await db.query(
      `UPDATE jobs
       SET status = ?, approval_status = ?, is_approved = ?, approved_by = ?, approved_at = ?,
           is_active = ?, scheduled_date = ?, published_at = ?,
           rejection_reason = CASE WHEN ? = TRUE THEN NULL ELSE rejection_reason END,
           reviewed_by = CASE WHEN ? = TRUE THEN NULL ELSE reviewed_by END,
           reviewed_at = CASE WHEN ? = TRUE THEN NULL ELSE reviewed_at END,
           closed_at = CASE WHEN ? = 'closed' THEN COALESCE(closed_at, NOW()) ELSE NULL END,
           updated_at = NOW()
       WHERE id = ?${ownerClause}`,
      [canonicalStatus, approvalStatus, isApproved, approvedBy, approvedAt, isActive, scheduledDate,
        publishedAt, needsReview, needsReview, needsReview, canonicalStatus, ...ownerParams],
    );

    console.log(`--> [SUCCESS] Job ID ${jobId} status successfully updated to "${canonicalStatus}"!`);
    const [[publishedJob]] = await db.query(
      `SELECT j.*,
              COALESCE(NULLIF(j.company_name, ''), NULLIF(cp.company_name, ''), u.full_name, 'Company') AS broadcast_company_name
       FROM jobs j
       JOIN users u ON u.id = j.employer_id
       LEFT JOIN company_profiles cp ON cp.employer_id = j.employer_id
       WHERE j.id = ? LIMIT 1`,
      [jobId],
    );
    let telegramBroadcast = null;
    if (isPublishing && !wasPubliclyAvailable && isPubliclyEligibleJob(publishedJob || {})) {
      telegramBroadcast = await dispatchPublishedJobNotifications({
        ...publishedJob,
        company_name: publishedJob.broadcast_company_name,
      });
    }
    return res.json({
      success: true,
      status: publishedJob?.status || canonicalStatus,
      approval_status: publishedJob?.approval_status || approvalStatus,
      message: `Job status updated to ${canonicalStatus} successfully.`,
      telegramBroadcast,
    });
  } catch (error) {
    console.error('--> [FATAL ERROR UPDATING JOB STATUS]:', error.message);
    return res.status(500).json({
      success: false,
      error: `Database update failed: ${error.message}`
    });
  }
};

app.patch('/api/jobs/:id/status', authenticateUser, handleJobStatusUpdate);
app.put('/api/jobs/:id/status', authenticateUser, handleJobStatusUpdate);
app.patch('/api/jobs/:id', authenticateUser, handleJobStatusUpdate);
app.patch('/api/employer/jobs/:id/status', authenticateUser, handleJobStatusUpdate);
app.put('/api/employer/jobs/:id/status', authenticateUser, handleJobStatusUpdate);

// ==========================================
// 6. EMPLOYER MY JOBS API
// ==========================================
const handleGetEmployerMyJobs = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.user_id || null;

    console.log(`--> [FETCHING MY JOBS] Authenticated User ID: ${userId}`);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Employer ID is missing from authenticated session.',
      });
    }

    const [empProfiles] = await db.query(
      'SELECT company_name, representative_name FROM employers WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId],
    );
    const companyName = empProfiles?.[0]?.company_name || empProfiles?.[0]?.representative_name || '';

    const [jobs] = await db.query(
      `SELECT
        j.*,
        DATE_FORMAT(j.scheduled_date, '%Y-%m-%dT%H:%i:%sZ') AS scheduledAt,
         COALESCE((SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id), 0) AS total_applicants,
         COALESCE((SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND (a.status = 'pending' OR a.status IS NULL)), 0) AS pending_count,
         COALESCE((SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'shortlisted'), 0) AS shortlisted_count,
         COALESCE((SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'hired'), 0) AS hired_count
       FROM jobs j
       WHERE
         j.employer_id = ?
         OR j.employer_id IN (
           SELECT e.id
           FROM employers e
           WHERE e.user_id = ?
         )
         OR j.employer_id IN (
           SELECT cp.id
           FROM company_profiles cp
           WHERE cp.employer_id = ?
         )
         OR j.employer_id IN (
           SELECT he.id
           FROM household_employers he
           WHERE he.user_id = ?
         )
         OR (j.company_name = ? AND ? != '')
       ORDER BY j.created_at DESC`,
      [userId, userId, userId, userId, companyName, companyName],
    );

    console.log(`--> [SUCCESS] Found ${jobs.length} jobs for user ${userId} in database!`);

    return res.json({
      success: true,
      count: jobs.length,
      jobs: (jobs || []).map((job) => ({
        ...job,
        isScheduled: String(job.status).toLowerCase() === 'scheduled' && Boolean(job.scheduledAt),
      })),
    });
  } catch (error) {
    console.error('--> [FETCH MY JOBS ERROR]:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

app.get('/api/employer/my-jobs', authenticateUser, handleGetEmployerMyJobs);
app.get('/api/jobs/my-jobs', authenticateUser, handleGetEmployerMyJobs);

// ==========================================
// 6. GET ALL JOBS API
// ==========================================
app.get('/api/jobs', jobController.getJobs);

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const [[job]] = await db.query(`
      SELECT jobs.*,
             COALESCE(
               NULLIF(NULLIF(jobs.company_name, ''), CONCAT(users.full_name, CHAR(39), 's Company')),
               NULLIF(NULLIF(cp.company_name, ''), CONCAT(users.full_name, CHAR(39), 's Company')),
               'Company'
             ) AS company_name,
             users.full_name AS employer_name
      FROM jobs
      LEFT JOIN users ON users.id = jobs.employer_id
      LEFT JOIN company_profiles cp ON cp.employer_id = jobs.employer_id
      WHERE jobs.id = ? AND jobs.status = 'active'
        AND LOWER(jobs.approval_status) = 'approved'
        AND jobs.is_approved = TRUE
        AND jobs.is_active = TRUE
        AND (jobs.deadline IS NULL OR jobs.deadline >= CURDATE())
        AND (jobs.scheduled_date IS NULL OR jobs.scheduled_date <= NOW())
      LIMIT 1
    `, [req.params.id]);
    if (!job) return res.status(404).json({ success: false, message: 'Published job not found.' });
    return res.json({
      success: true,
      job: { ...job, sub_sectors: normalizeSubSectors(job.sub_sectors) || [] },
    });
  } catch (error) {
    console.error('Get Job Details Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to load job details.' });
  }
});

try {
  app.use('/api', require('./routes/employerRoutes'));
} catch (error) {
  console.warn('Employer routes could not be loaded:', error.message);
}

// ==========================================
// 🔔 NOTIFICATION SYSTEM ENDPOINTS
// ==========================================

// Helper: Send single user notification
async function sendNotification(userId, recipientRole, title, message, type, link, priority = 'normal') {
  try {
    await db.query(`
      INSERT INTO notifications (user_id, type, title, message, action_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `, [userId, type, title, message, link]);
    console.log(`--> [NOTIFICATION SENT] User: ${userId} | Type: ${type} | Priority: ${priority}`);
  } catch (err) {
    console.error("--> [NOTIFICATION SEND ERROR]:", err.message);
  }
}

// Helper: Broadcast System Notification to ALL Employers
async function broadcastSystemAnnouncement(title, message, link = '/employer/dashboard', priority = 'high') {
  try {
    const [employers] = await db.query("SELECT id FROM users WHERE role = 'employer' LIMIT 1000");
    let count = 0;
    for (const emp of employers) {
      await sendNotification(emp.id, 'employer', title, message, 'system_announcement', link, priority);
      count++;
    }
    console.log(`--> [SYSTEM BROADCAST] Dispatched to ${count} employers!`);
    return count;
  } catch (e) {
    console.error("Broadcast failed:", e);
    return 0;
  }
}

// 1. GET /api/employer/notifications - Fetch notifications for employer
app.get('/api/employer/notifications', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const limit = Number(req.query.limit) || 50;

    const [notifications] = await db.query(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `, [userId, limit]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.json({ 
      success: true, 
      count: notifications.length, 
      unreadCount, 
      notifications 
    });
  } catch (err) {
    console.error("--> [GET NOTIFICATIONS ERROR]:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. PATCH /api/employer/notifications/mark-read - Mark notification(s) as read
app.patch('/api/employer/notifications/mark-read', authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const { notificationId } = req.body;

    if (notificationId) {
      // Mark single notification as read
      const [result] = await db.query(
        "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND user_id = ?", 
        [notificationId, userId]
      );
      return res.json({ success: true, message: "Notification marked as read", rowsAffected: result.affectedRows });
    } else {
      // Mark all notifications as read
      const [result] = await db.query(
        "UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ?", 
        [userId]
      );
      return res.json({ success: true, message: `${result.affectedRows} notifications marked as read` });
    }
  } catch (err) {
    console.error("--> [MARK READ ERROR]:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. ADMIN ENDPOINT - POST /api/admin/broadcast-notification
app.post('/api/admin/broadcast-notification', authenticateUser, async (req, res) => {
  // Only allow admin:
  const userRole = String(req.user?.role || '').trim().toLowerCase();
  const userEmail = String(req.user?.email || '').trim().toLowerCase();
  
  if (userRole !== 'admin' && !ADMIN_EMAILS.has(userEmail)) {
    return res.status(403).json({ success: false, error: "Unauthorized - Admin access required" });
  }

  const { title, message, link, priority } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, error: "Title and message are required" });
  }

  const count = await broadcastSystemAnnouncement(
    title, 
    message, 
    link || '/employer/dashboard', 
    priority || 'high'
  );

  return res.json({ 
    success: true, 
    message: `System announcement broadcasted to ${count} employers successfully.`,
    broadcastCount: count
  });
});

async function ensureAuthColumns() {
  try {
    const [jobTypeColumns] = await db.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_seeker_profiles' AND COLUMN_NAME = 'preferred_job_type'`
    );
    if (jobTypeColumns[0] && !jobTypeColumns[0].COLUMN_TYPE.includes("'contractual'")) {
      await db.query("ALTER TABLE job_seeker_profiles MODIFY COLUMN preferred_job_type ENUM('full-time', 'part-time', 'freelance', 'contractual', 'contract', 'volunteer', 'intern (paid)', 'intern (unpaid)', 'internship') DEFAULT 'full-time'");
    }

    const [applicationColumns] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications'`
    );
    const applicationColumnNames = new Set(applicationColumns.map(({ COLUMN_NAME: name }) => name));
    if (!applicationColumnNames.has('candidate_id')) {
      await db.query('ALTER TABLE applications ADD COLUMN candidate_id INT NULL AFTER job_seeker_id');
    }
    if (!applicationColumnNames.has('employer_id')) {
      await db.query('ALTER TABLE applications ADD COLUMN employer_id INT NULL AFTER candidate_id');
    }
    if (!applicationColumnNames.has('cv_id')) {
      await db.query('ALTER TABLE applications ADD COLUMN cv_id INT NULL');
    }
    if (!applicationColumnNames.has('resume_snapshot')) {
      await db.query('ALTER TABLE applications ADD COLUMN resume_snapshot JSON NULL');
    }
    if (!applicationColumnNames.has('evaluated_at')) {
      await db.query('ALTER TABLE applications ADD COLUMN evaluated_at DATETIME NULL');
    }
    const [applicationStatusColumns] = await db.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = 'status'`
    );
    if (applicationStatusColumns[0] && applicationStatusColumns[0].COLUMN_TYPE.startsWith('enum')) {
      const acceptedStatusSet = [
        'pending',
        'review',
        'shortlisted',
        'interviewed',
        'hired',
        'rejected',
        'applied',
        'under-review',
        'interview',
        'interview-scheduled',
        'withdrawn',
      ];
      const columnType = applicationStatusColumns[0].COLUMN_TYPE;
      const isLegacyOnly = acceptedStatusSet.every((status) => !columnType.includes(`'${status}'`));
      if (isLegacyOnly || !columnType.includes("'pending'")) {
        await db.query("ALTER TABLE applications MODIFY COLUMN status ENUM('pending', 'review', 'shortlisted', 'interviewed', 'hired', 'rejected', 'applied', 'under-review', 'interview', 'interview-scheduled', 'withdrawn') DEFAULT 'pending'");
      }
    }

    const [jobStatusColumns] = await db.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'status'`
    );
    if (jobStatusColumns[0] && jobStatusColumns[0].COLUMN_TYPE.startsWith('enum')) {
      await db.query("ALTER TABLE jobs MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'draft'");
    }
  } catch (error) {
    console.warn('Auth column compatibility check skipped:', error.message);
  }
}

const activateDueScheduledJobs = async () => {
  try {
    const [dueJobs] = await db.query(
            `SELECT id, title, company_name, description, sector AS category, experience_level,
              location, work_mode, job_type, deadline,
              salary_min, salary_max, currency, salary_period,
              is_salary_negotiable, required_skills, approval_status, is_active
       FROM jobs
       WHERE status = 'published'
         AND scheduled_date IS NOT NULL
         AND scheduled_date <= UTC_TIMESTAMP()
         AND approval_status = 'approved'
         AND is_approved = TRUE
         AND (deadline IS NULL OR deadline >= CURDATE())`,
    );
    const [result] = await db.query(
      `UPDATE jobs
         SET status = 'active', is_active = TRUE,
           published_at = COALESCE(published_at, UTC_TIMESTAMP())
       WHERE status = 'published'
         AND scheduled_date IS NOT NULL
         AND scheduled_date <= UTC_TIMESTAMP()
         AND approval_status = 'approved'
          AND is_approved = TRUE
          AND (deadline IS NULL OR deadline >= CURDATE())`
    );
    if (result.affectedRows) {
      console.log(`--> [SCHEDULED JOBS ACTIVATED] ${result.affectedRows} job(s)`);
    }
    for (const job of dueJobs) {
      try {
        await dispatchPublishedJobNotifications({
          ...job,
          status: 'active',
          is_active: true,
          approval_status: 'approved',
          is_approved: true,
        });
      } catch (error) {
        console.error(`Telegram broadcast failed for scheduled job ${job.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('--> [SCHEDULED JOB ACTIVATION ERROR]:', error.message);
  }
};

const expirePastDeadlineJobs = async () => {
  try {
    const [result] = await db.query(
      `UPDATE jobs
       SET status = 'expired', is_active = FALSE, scheduled_date = NULL, updated_at = NOW()
       WHERE status IN ('active', 'published', 'paused')
         AND deadline IS NOT NULL AND deadline < CURDATE()`,
    );
    if (result.affectedRows) console.log(`--> [EXPIRED JOBS UPDATED] ${result.affectedRows} job(s)`);
  } catch (error) {
    console.error('--> [JOB EXPIRY UPDATE ERROR]:', error.message);
  }
};

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path === '/api' || req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (!fs.existsSync(indexPath)) return next();
  return res.sendFile(indexPath);
});

ensureDatabaseSchema()
  .then(() => ensureAuthColumns())
  .then(async () => {
    try {
      const webhook = await configureTelegramWebhook();
      if (webhook.configured) console.log('Telegram bot webhook configured.');
      else console.warn(webhook.reason);
    } catch (error) {
      console.error('Telegram webhook configuration failed:', error.message);
    }
    activateDueScheduledJobs();
    const scheduledJobTimer = setInterval(activateDueScheduledJobs, 30_000);
    scheduledJobTimer.unref();
    expirePastDeadlineJobs();
    const jobExpiryTimer = setInterval(expirePastDeadlineJobs, 60_000);
    jobExpiryTimer.unref();
    const deadlineReminderTimer = setInterval(() => {
      sendDeadlineReminders().catch((error) => {
        console.error('Telegram deadline reminder scan failed:', error.message);
      });
    }, 15 * 60_000);
    deadlineReminderTimer.unref();
    const adminStatsTimer = setInterval(() => {
      sendDailyAdminStatsOnce().catch((error) => {
        console.error('Telegram daily admin statistics failed:', error.message);
      });
    }, 15 * 60_000);
    adminStatsTimer.unref();
    sendDeadlineReminders().catch((error) => {
      console.error('Telegram deadline reminder scan failed:', error.message);
    });
    sendDailyAdminStatsOnce().catch((error) => {
      console.error('Telegram daily admin statistics failed:', error.message);
    });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database schema migration failed:', error.message);
    process.exit(1);
  });
