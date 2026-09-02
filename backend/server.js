const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./connection');
const { validateSignUp, validateLogin } = require('./middleware/validateAuth');
const { issueOtp } = require('./services/otpService');
const { syncGoogleUser } = require('./config/googleAuth');

const app = express();

// ==========================================
// ⚙️ MIDDLEWARES & CORS CONFIGURATION
// ==========================================

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true
  }
}));

// Passport Middleware Initializing
app.use(passport.initialize());
app.use(passport.session());

// Uploads ፎልደር ማዘጋጀት
const uploadDir = path.join(__dirname, 'uploads/cvs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';

const ensureDatabaseSchema = async () => {
  try {
    await db.query(`ALTER TABLE users
      MODIFY COLUMN role ENUM('super_admin', 'admin', 'employer', 'job_seeker') NOT NULL DEFAULT 'job_seeker'`);
    await db.query(`ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL`);
  } catch (error) {
    console.warn('Role/password compatibility update skipped:', error.message);
  }

  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(255) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email'`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE`);
  } catch (error) {
    console.warn('User schema compatibility check skipped:', error.message);
  }

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(100) NOT NULL,
      otp_code VARCHAR(10) NOT NULL,
      purpose ENUM('registration', 'password-reset', 'email-verification') DEFAULT 'registration',
      is_used BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_expires (email, expires_at)
    )`);
  } catch (error) {
    console.warn('OTP table compatibility check skipped:', error.message);
  }

  try {
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10) NULL');
    await db.query("ALTER TABLE otps ADD COLUMN IF NOT EXISTS purpose ENUM('registration', 'password-reset', 'email-verification') DEFAULT 'registration'");
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE');
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NULL DEFAULT NULL');
    await db.query('ALTER TABLE otps ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  } catch (error) {
    console.warn('OTP column migration skipped:', error.message);
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
      verificationStatus ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`);

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
    await db.query("ALTER TABLE user_activity_log MODIFY COLUMN activity_type ENUM('login', 'profile-update', 'job-view', 'job-apply', 'profile-view', 'message-sent', 'cv-upload', 'role_selected') NOT NULL");
  } catch (error) {
    console.warn('Activity log migration skipped:', error.message);
  }

  try {
    await db.query("ALTER TABLE jobs MODIFY COLUMN status ENUM('draft', 'published', 'closed', 'filled', 'archived', 'suspended') DEFAULT 'draft'");
  } catch (error) {
    console.warn('Job status migration skipped:', error.message);
  }
};

// ==========================================
// 🔑 AUTHENTICATION ROUTES
// ==========================================
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
} catch (err) {
  console.warn('Notice: ./routes/auth file not loaded directly or optional.');
}

// ==========================================
// 📧 NODEMAILER SETUP
// ==========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const ADMIN_EMAILS = new Set(['tekebaaweke32@gmail.com']);

const resolveEffectiveRole = (role, email) => {
  const targetEmail = String(email || '').trim().toLowerCase();
  if (ADMIN_EMAILS.has(targetEmail)) return 'admin';
  const value = String(role || 'job_seeker').trim().toLowerCase();
  const safeRoles = ['super_admin', 'admin', 'employer', 'job_seeker'];
  return safeRoles.includes(value) ? value : 'job_seeker';
};

const sanitizeUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  phone: user.phone || null,
  role: resolveEffectiveRole(user.role, user.email),
  is_verified: Boolean(user.is_verified),
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
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `cv-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
    }
  }
});

// ==========================================
// 🛡️ AUTHENTICATION MIDDLEWARE
// ==========================================
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      message: 'Unauthorized / እባክዎ አስቀድመው ይግቡ (Token missing)' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      message: 'Invalid or expired token / የቆየ ወይም የተሳሳተ Token' 
    });
  }
};

const requireAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').trim().toLowerCase();
  const email = String(req.user?.email || '').trim().toLowerCase();
  if (role === 'admin' || role === 'super_admin' || ADMIN_EMAILS.has(email)) {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Admin access required.' });
};

const adminController = require('./controllers/adminController');

app.get('/api/admin/overview', authenticateUser, requireAdmin, adminController.getAdminDashboardData);
app.patch('/api/admin/companies/:companyId/verify', authenticateUser, requireAdmin, adminController.verifyCompany);
app.patch('/api/admin/company/:id/verify', authenticateUser, requireAdmin, adminController.updateVerificationStatus);
app.get('/api/admin/companies', authenticateUser, requireAdmin, adminController.getPendingCompanies);
app.get('/api/admin/jobs', authenticateUser, requireAdmin, adminController.getAllJobsForModeration);
app.get('/api/admin/jobs/:id/preview', authenticateUser, requireAdmin, adminController.getJobPreview);
app.patch('/api/admin/users/:userId/status', authenticateUser, requireAdmin, adminController.toggleUserStatus);
app.patch('/api/admin/jobs/:jobId/status', authenticateUser, requireAdmin, adminController.toggleJobStatus);
app.patch('/api/admin/jobs/:id/moderate', authenticateUser, requireAdmin, adminController.toggleJobStatus);
app.delete('/api/admin/jobs/:id', authenticateUser, requireAdmin, adminController.deleteJob);

app.put('/api/seeker/profile', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const profile = req.body || {};
  const completion = Math.max(0, Math.min(100, Number(profile.completionPercentage) || 0));
  try {
    await db.query(
      `INSERT INTO job_seeker_profiles (user_id, headline, bio, location, country, city, preferred_work_mode, salary_expectation_min, profile_completion_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE headline = VALUES(headline), bio = VALUES(bio), location = VALUES(location), country = VALUES(country), city = VALUES(city), preferred_work_mode = VALUES(preferred_work_mode), salary_expectation_min = VALUES(salary_expectation_min), profile_completion_percentage = VALUES(profile_completion_percentage)`,
      [
        userId,
        profile.preferredJob || null,
        profile.bio || null,
        profile.city || profile.preferredCity || null,
        profile.country || null,
        profile.city || null,
        profile.preferredWorkSetup ? String(profile.preferredWorkSetup).toLower() : 'hybrid',
        Number.parseInt(String(profile.salaryExpectation || '').replace(/[^0-9]/g, ''), 10) || null,
        completion,
      ]
    );
    return res.json({ success: true, profileCompletionPercentage: completion });
  } catch (error) {
    console.error('Save Seeker Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to save personal information.' });
  }
});

// Schema-backed employer workspace API. It is mounted before legacy job handlers.
try {
  app.use('/api', require('./routes/employerRoutes'));
} catch (error) {
  console.warn('Employer routes could not be loaded:', error.message);
}

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

  let seekerArray = Array.isArray(seekerSkills) 
    ? seekerSkills 
    : (seekerSkills || '').split(',').map(s => s.trim());

  if (!reqArray.length || reqArray[0] === '') return 50;

  const seekerSet = new Set(seekerArray.map(s => s.toLowerCase()));
  
  let matchCount = 0;
  reqArray.forEach(skill => {
    if (seekerSet.has(skill.toLowerCase())) {
      matchCount++;
    }
  });

  const score = Math.round((matchCount / reqArray.length) * 100);
  return Math.max(score, 35);
}

// ==========================================
// 📩 1. SEND OTP API
// ==========================================
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required / እባክዎ ኢሜይል ያስገቡ' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const [users] = await db.query('SELECT phone FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'Account not found.' });
    const { delivery } = await issueOtp({ dbClient: db, email: normalizedEmail, phone: users[0].phone, purpose: 'registration' });
    res.status(200).json({ success: true, delivery: { emailSent: delivery.email, smsSent: delivery.sms }, message: 'OTP sent to email successfully / OTP በኢሜይልዎ ተልኳል' });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP email / ኢሜይል መላክ አልተቻለም' });
  }
});

// ==========================================
// 🔑 2. VERIFY OTP API
// ==========================================
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp, role } = req.body;
  const selectedRole = role === 'employer' || role === 'job_seeker' ? role : null;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Missing email or OTP / ኢሜይል ወይም OTP አልተገኘም' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, otp_code, expires_at FROM otps WHERE email = ? AND is_used = FALSE ORDER BY created_at DESC LIMIT 1',
      [String(email).trim().toLowerCase()]
    );

    if (rows.length > 0) {
      const cleanEmail = String(email).trim().toLowerCase();
      const otpRecord = rows[0];
      const expiresAt = new Date(otpRecord.expires_at);

      if (new Date() > expiresAt || otpRecord.otp_code !== String(otp).trim()) {
        await db.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP code / የተሳሳተ ወይም ጊዜው ያለፈበት OTP' });
      }

      await db.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);
      await db.query(
        'UPDATE users SET is_verified = TRUE' + (selectedRole ? ', role = ?' : '') + ' WHERE email = ?',
        selectedRole ? [selectedRole, cleanEmail] : [cleanEmail]
      );
      const [verifiedUsers] = await db.query(
        'SELECT id, full_name, email, phone, role, is_verified, is_active, profile_picture_url FROM users WHERE email = ? LIMIT 1',
        [cleanEmail]
      );
      const verifiedUser = verifiedUsers[0];
      const token = jwt.sign({ id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({ success: true, message: 'Email verified successfully / ኢሜይልዎ በስኬት ተረጋገጠ!', token, user: sanitizeUser(verifiedUser) });
    }
  } catch (dbErr) {
    console.error('DB Verification Error:', dbErr);
  }

  return res.status(400).json({ success: false, message: 'Invalid or expired OTP code / የተሳሳተ ወይም ጊዜው ያለፈበት OTP' });
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
  const selectedRole = role === 'employer' || role === 'job_seeker' ? role : 'job_seeker';

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
        'UPDATE users SET full_name = ?, phone = ?, password = ?, role = ?, is_verified = FALSE, is_active = TRUE WHERE id = ?',
        [userFullName, userPhone || null, hashedPassword, selectedRole, existingUser.id]
      );
      await db.query('UPDATE otps SET is_used = TRUE WHERE email = ? AND is_used = FALSE', [normalizedEmail]);

      await issueOtp({ dbClient: db, email: normalizedEmail, phone: userPhone, purpose: 'registration' });

      return res.status(201).json({
        success: true,
        requiresVerification: true,
        email: normalizedEmail,
        role: selectedRole,
        userId: existingUser.id,
        message: 'ያልተጠናቀቀ ምዝገባ ተገኝቷል። አዲስ የማረጋገጫ ኮድ ተልኳል።'
      });
    }

    const [result] = await db.query(
      'INSERT INTO users (full_name, email, phone, password, role, is_verified, is_active) VALUES (?, ?, ?, ?, ?, FALSE, TRUE)',
      [userFullName, normalizedEmail, userPhone || null, hashedPassword, selectedRole]
    );

    if (selectedRole === 'employer') {
      await db.query(
        'INSERT INTO company_profiles (employer_id, company_name) VALUES (?, ?)',
        [result.insertId, req.body.companyName || userFullName]
      );
    } else {
      await db.query('INSERT INTO job_seeker_profiles (user_id) VALUES (?)', [result.insertId]);
    }

    await issueOtp({ dbClient: db, email: normalizedEmail, phone: userPhone, purpose: 'registration' });

    res.status(201).json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      role: selectedRole,
      userId: result.insertId,
      message: 'User registered successfully / ተጠቃሚው በተሳካ ሁኔታ ተመዝግቧል!'
    });
  } catch (error) {
    console.error('Register Error Detailed:', error);
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        message: `Database Column Error: ${error.sqlMessage}. እባክዎ በ Database users table ላይ SQL ALTER query ያካሂዱ።`
      });
    }

    res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል: ' + error.message });
  }
});

app.post('/api/complete-registration', async (req, res) => {
  const { email, role } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRole = normalizeRole(role);

  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const [userRows] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRows[0];
    await db.query('UPDATE users SET role = ?, is_verified = TRUE WHERE id = ?', [normalizedRole, user.id]);

    if (normalizedRole === 'employer') {
      await db.query(
        `INSERT INTO company_profiles (employer_id, company_name)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE company_name = VALUES(company_name)`,
        [user.id, user.full_name]
      );
    } else if (normalizedRole === 'job_seeker') {
      await db.query(
        'INSERT INTO job_seeker_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)',
        [user.id]
      );
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: normalizedRole }, JWT_SECRET, { expiresIn: '7d' });

    const updatedUser = { ...user, role: normalizedRole, is_verified: true };

    return res.status(200).json({
      success: true,
      message: 'Registration completed successfully.',
      token,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error('Complete Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to complete registration.' });
  }
});

// ==========================================
// 4. USER LOGIN API
// ==========================================
app.post('/api/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: 'Please provide email and password / እባክዎ ኢሜይል እና ፓስወርድ ያስገቡ' });
  }

  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, password, phone, role, is_verified, is_active, profile_picture_url FROM users WHERE email = ? LIMIT 1',
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ይህ ኢሜይል አልተመዝገበም። እባክዎ መጀመሪያ ይመዝገቡ (Account not found. Please sign up first)'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    if (!user.is_verified) {
      await db.query('UPDATE users SET is_verified = TRUE WHERE id = ?', [user.id]);
      user.is_verified = true;
    }

    const resolvedRole = resolveEffectiveRole(user.role, user.email);
    if (resolvedRole !== user.role) {
      await db.query('UPDATE users SET role = ? WHERE id = ?', [resolvedRole, user.id]);
      user.role = resolvedRole;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: resolvedRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Login successful / በተሳካ ሁኔታ ገብተዋል',
      token,
      is_verified: Boolean(user.is_verified),
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
  }
});

app.post('/api/send-login-otp', async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email is required / እባክዎ ኢሜይል ያስገቡ' });
  }

  try {
    const [userRows] = await db.query('SELECT id, email, phone FROM users WHERE email = ?', [normalizedEmail]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found / መለያ አልተገኘም' });
    }

    const { delivery } = await issueOtp({ dbClient: db, email: normalizedEmail, phone: userRows[0].phone, purpose: 'email-verification' });

    return res.status(200).json({ success: true, delivery: { emailSent: delivery.email, smsSent: delivery.sms }, message: 'OTP sent to your email / OTP ወደ ኢሜይልዎ ተልኳል' });
  } catch (error) {
    console.error('Send Login OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to send OTP / OTP መላክ አልተቻለም' });
  }
});

app.post('/api/verify-login-otp', async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const otpCode = String(otp || '').trim();

  if (!normalizedEmail || !otpCode) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required / ኢሜይል እና OTP ያስፈልጋሉ' });
  }

  try {
    const [otpRows] = await db.query(
      'SELECT id, otp_code, expires_at FROM otps WHERE email = ? AND is_used = FALSE ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail]
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP / የተሳሳተ ወይም ጊዜው ያለፈበት OTP' });
    }

    const otpRecord = otpRows[0];
    if (new Date() > new Date(otpRecord.expires_at) || otpRecord.otp_code !== otpCode) {
      await db.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP / የተሳሳተ ወይም ጊዜው ያለፈበት OTP' });
    }

    await db.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);

    const [userRows] = await db.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found / ተጠቃሚው አልተገኘም' });
    }

    const user = userRows[0];
    await db.query('UPDATE users SET is_verified = TRUE WHERE id = ?', [user.id]);
    const effectiveRole = resolveEffectiveRole(user.role, user.email);
    if (effectiveRole !== user.role) {
      await db.query('UPDATE users SET role = ? WHERE id = ?', [effectiveRole, user.id]);
      user.role = effectiveRole;
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: effectiveRole }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully / OTP በትክክል ተረጋገጠ',
      token,
      user: sanitizeUser({ ...user, is_verified: true, role: effectiveRole }),
    });
  } catch (error) {
    console.error('Verify Login OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify login OTP / OTP ማረጋገጥ አልተቻለም' });
  }
});

app.post('/api/google-login', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Google access token is required.' });
  }

  try {
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!googleResponse.ok) {
      throw new Error('Google token invalid');
    }

    const profile = await googleResponse.json();
    const syncResult = await syncGoogleUser({ profile, authProvider: 'google' });
    const user = syncResult.user;

    const authToken = jwt.sign({ id: user.id, email: user.email, role: user.role || 'job_seeker' }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      success: true,
      token: authToken,
      user,
      isNewUser: syncResult.isNewUser,
      message: 'Google login successful',
    });
  } catch (error) {
    console.error('Google Login Error:', error);
    return res.status(500).json({ success: false, message: 'Google login failed / Google መግባት አልተሳካም' });
  }
});

// ==========================================
// 5. CREATE JOB API
// ==========================================
app.post('/api/jobs', authenticateUser, async (req, res) => {
  const { title, company, description, category, location, salary, required_skills } = req.body;
  const employer_id = req.user.id;

  if (!title || !description || !category || !location) {
    return res.status(400).json({ message: 'Please fill all required fields / እባክዎ ሁሉንም አስፈላጊ መረጃዎች ያስገቡ' });
  }

  try {
    const employerRole = (req.user.role || '').toLowerCase().trim();
    if (employerRole !== 'employer') {
      return res.status(403).json({ message: 'Only employers can post jobs / ሥራ መለጥፍ የሚችሉት አሰሪዎች ብቻ ናቸው' });
    }

    const query = 'INSERT INTO jobs (employer_id, title, company, description, category, location, salary, required_skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    await db.query(query, [employer_id, title, company || '', description, category, location, salary || '', required_skills || '']);

    res.status(201).json({ message: 'Job posted successfully / ሥራው በተሳካ ሁኔታ ተለጥፏል!' });

  } catch (error) {
    console.error('Create Job Error:', error);
    res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
  }
});

// ==========================================
// 6. GET ALL JOBS API
// ==========================================
app.get('/api/jobs', async (req, res) => {
  try {
    const [jobs] = await db.query('SELECT jobs.*, users.full_name as employer_name FROM jobs JOIN users ON jobs.employer_id = users.id ORDER BY created_at DESC');
    res.status(200).json(jobs);
  } catch (error) {
    console.error('Get Jobs Error:', error);
    res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
  }
});

// ==========================================
// 7. APPLY FOR A JOB API
// ==========================================
app.post('/api/applications', authenticateUser, upload.single('resume'), async (req, res) => {
  const { job_id } = req.body;
  const job_seeker_id = req.user.id;

  if (!job_id) {
    return res.status(400).json({ message: 'Missing job ID / የሥራው መለያ አልተገኘም' });
  }

  try {
    const userRole = (req.user.role || '').toLowerCase().trim();
    if (userRole === 'employer') {
      return res.status(403).json({ message: 'Only job seekers can apply / ማመልከት የሚችሉት ሥራ ፈላጊዎች ብቻ ናቸው' });
    }

    const [seeker] = await db.query('SELECT skills FROM users WHERE id = ?', [job_seeker_id]);
    if (seeker.length === 0) {
      return res.status(404).json({ message: 'User not found / ተጠቃሚው አልተገኘም' });
    }

    const [job] = await db.query('SELECT required_skills FROM jobs WHERE id = ?', [job_id]);
    if (job.length === 0) {
      return res.status(404).json({ message: 'Job not found / ሥራው አልተገኘም' });
    }

    const [existing] = await db.query('SELECT * FROM applications WHERE job_id = ? AND job_seeker_id = ?', [job_id, job_seeker_id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'You have already applied for this job / ለዚህ ሥራ ቀደም ብለው አመልክተዋል' });
    }

    const resumeUrl = req.file ? `/uploads/cvs/${req.file.filename}` : '';
    const matchScore = calculateRealMatch(seeker[0].skills, job[0].required_skills);

    const query = 'INSERT INTO applications (job_id, job_seeker_id, match_score, resume_url) VALUES (?, ?, ?, ?)';
    await db.query(query, [job_id, job_seeker_id, matchScore, resumeUrl]);

    res.status(201).json({ 
      message: 'Application submitted successfully / ማመልከቻዎ በተሳካ ሁኔታ ተልኳል!',
      matchScore: matchScore,
      resumeUrl: resumeUrl
    });

  } catch (error) {
    console.error('Apply Job Error:', error);
    res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
  }
});

// ==========================================
// 8. GET APPLICATIONS FOR A JOB
// ==========================================
app.get('/api/applications/job/:job_id', authenticateUser, async (req, res) => {
  const { job_id } = req.params;

  try {
    const query = `
      SELECT applications.*, users.full_name, users.email, users.skills 
      FROM applications 
      JOIN users ON applications.job_seeker_id = users.id 
      WHERE applications.job_id = ?
      ORDER BY applications.match_score DESC
    `;
    const [applications] = await db.query(query, [job_id]);
    res.status(200).json(applications);
  } catch (error) {
    console.error('Get Applications Error:', error);
    res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
  }
});

// ==========================================
// 🚨 GLOBAL ERROR HANDLING MIDDLEWARE
// ==========================================
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// ==========================================
// 🚀 SERVER START
// ==========================================
const startServer = async () => {
  try {
    await ensureDatabaseSchema();
    console.log('✅ Database compatibility checks complete.');
  } catch (error) {
    console.warn('⚠️ Compatibility check failed:', error.message);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running perfectly on http://localhost:${PORT}`);
    console.log(`📝 Database: ${process.env.DB_NAME || 'job_matching'}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
    } else {
      console.error('❌ Server error:', error.message);
    }
  });
};

startServer();

console.log("Email Pass Length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "ባዶ ነው");

console.log("Email User:", process.env.EMAIL_USER);