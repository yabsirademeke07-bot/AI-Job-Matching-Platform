const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobRoutes");
const matchRoutes = require("./routes/matchRoutes");
const jobSeekerRoutes = require("./routes/jobSeekerRoutes");
const cvRoutes = require("./routes/cvRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/v1/cv", cvRoutes);
app.use("/api/job-seekers", jobSeekerRoutes);
app.use("/api/seeker", jobSeekerRoutes);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    message: "AI-Powered Job Matching System Backend is running"
  });
});

const PORT = process.env.PORT || 5000;

const ensureAuthColumns = async () => {
  const [columns] = await db.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
      AND ((TABLE_NAME = 'users' AND COLUMN_NAME IN ('last_active_page', 'last_state_payload', 'onboarding_completed'))
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
  if (!existingColumns.has('onboarding_completed')) {
    await db.query('ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE');
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