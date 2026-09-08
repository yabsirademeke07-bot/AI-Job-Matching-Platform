const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobRoutes");
const matchRoutes = require("./routes/matchRoutes");
const jobSeekerRoutes = require("./routes/jobSeekerRoutes");
const cvRoutes = require("./routes/cvRoutes");
const seekerMatchingRoutes = require("./routes/seekerMatchingRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api", seekerMatchingRoutes);
app.use("/api/job-seekers", jobSeekerRoutes);
app.use("/api/seeker", jobSeekerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    message: "AI-Powered Job Matching System Backend is running"
  });
});

const PORT = process.env.PORT || 5000;

const ensureAuthColumns = async () => {
  await db.query('DROP TABLE IF EXISTS seeker_experience');
  const [columns] = await db.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND ((TABLE_NAME = 'users' AND COLUMN_NAME IN ('last_active_page', 'last_state_payload'))
         OR (TABLE_NAME = 'otps' AND COLUMN_NAME = 'purpose'))`
  );
  const existingColumns = new Set(columns.map(({ COLUMN_NAME: name }) => name));
  const purposeColumn = columns.find(({ COLUMN_NAME: name }) => name === 'purpose');

  if (purposeColumn && !purposeColumn.COLUMN_TYPE.includes("'login'")) {
    await db.query(
      "ALTER TABLE otps MODIFY COLUMN purpose ENUM('registration', 'password-reset', 'email-verification', 'login') DEFAULT 'registration'"
    );
  }

  if (!existingColumns.has('last_active_page')) {
    await db.query("ALTER TABLE users ADD COLUMN last_active_page VARCHAR(100) DEFAULT '/dashboard'");
  }
  if (!existingColumns.has('last_state_payload')) {
    await db.query('ALTER TABLE users ADD COLUMN last_state_payload JSON NULL');
  }

  const [profileColumns] = await db.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_seeker_profiles'`
  );
  const profileColumnNames = new Set(profileColumns.map(({ COLUMN_NAME: name }) => name));
  if (!profileColumnNames.has('job_category')) await db.query("ALTER TABLE job_seeker_profiles ADD COLUMN job_category VARCHAR(80) NULL");
  if (!profileColumnNames.has('experience_level')) await db.query("ALTER TABLE job_seeker_profiles ADD COLUMN experience_level VARCHAR(30) NULL");
  if (!profileColumnNames.has('education_level')) await db.query("ALTER TABLE job_seeker_profiles ADD COLUMN education_level VARCHAR(80) NULL AFTER experience_level");
  if (!profileColumnNames.has('profile_completed')) await db.query("ALTER TABLE job_seeker_profiles ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE");
  const [workModeColumns] = await db.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'job_seeker_profiles' AND COLUMN_NAME = 'preferred_work_mode'`
  );
  if (workModeColumns[0] && !workModeColumns[0].COLUMN_TYPE.includes("'any'")) {
    await db.query("ALTER TABLE job_seeker_profiles MODIFY COLUMN preferred_work_mode ENUM('on-site', 'remote', 'hybrid', 'any') DEFAULT 'hybrid'");
  }
  const consolidatedColumns = {
    education: 'JSON NULL', graduation_year: 'VARCHAR(10) NULL', skills: 'JSON NULL', languages: 'JSON NULL',
    job_preferences: 'JSON NULL', job_type: 'VARCHAR(40) NULL', expected_salary: 'INT NULL',
    work_setup: 'VARCHAR(30) NULL', raw_cv_text: 'LONGTEXT NULL', parsed_json_payload: 'JSON NULL',
  };
  for (const [column, definition] of Object.entries(consolidatedColumns)) {
    const [existing] = await db.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = \'job_seeker_profiles\' AND COLUMN_NAME = ?',
      [column]
    );
    if (!existing.length) await db.query(`ALTER TABLE job_seeker_profiles ADD COLUMN ${column} ${definition}`);
  }
  for (const column of ['experience_detail', 'experience_role', 'experience', 'state_province', 'latitude', 'longitude']) {
    const [existing] = await db.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = \'job_seeker_profiles\' AND COLUMN_NAME = ?',
      [column]
    );
    if (existing.length) await db.query(`ALTER TABLE job_seeker_profiles DROP COLUMN ${column}`);
  }

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
  if (!applicationColumnNames.has('cv_id')) {
    await db.query('ALTER TABLE applications ADD COLUMN cv_id INT NULL');
  }
  if (!applicationColumnNames.has('resume_snapshot')) {
    await db.query('ALTER TABLE applications ADD COLUMN resume_snapshot JSON NULL');
  }

  const [jobStatusColumns] = await db.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobs' AND COLUMN_NAME = 'status'`
  );
  if (jobStatusColumns[0] && !jobStatusColumns[0].COLUMN_TYPE.includes("'active'")) {
    await db.query("ALTER TABLE jobs MODIFY COLUMN status ENUM('draft', 'active', 'published', 'closed', 'filled', 'archived') DEFAULT 'draft'");
  }
};

ensureAuthColumns()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database schema migration failed:', error.message);
    process.exit(1);
  });