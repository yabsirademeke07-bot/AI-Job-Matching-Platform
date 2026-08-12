require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('./connection');

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

const otpStore = new Map();

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
  limits: { fileSize: 5 * 1024 * 1024 },
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    try {
      await db.query(
        `INSERT INTO otps (email, otp, expires_at) 
         VALUES (?, ?, NOW() + INTERVAL 10 MINUTE) 
         ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
        [email, otp]
      );
    } catch (dbErr) {
      console.warn('DB OTP Insert warning (proceeding with memory):', dbErr.message);
    }

    const mailOptions = {
      from: `"SmartRecruit AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'SmartRecruit AI - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #1e293b;">SmartRecruit AI Verification</h2>
          <p style="color: #475569;">Your email verification code (OTP) is:</p>
          <h1 style="color: #2563eb; letter-spacing: 5px; background: #f1f5f9; padding: 10px; display: inline-block; border-radius: 5px;">${otp}</h1>
          <p style="color: #64748b; font-size: 12px;">This code will expire in 5 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'OTP sent to email successfully / OTP በኢሜይልዎ ተልኳል' });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP email / ኢሜይል መላክ አልተቻለም' });
  }
});

// ==========================================
// 🔑 2. VERIFY OTP API
// ==========================================
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Missing email or OTP / ኢሜይል ወይም OTP አልተገኘም' });
  }

  const record = otpStore.get(email);
  if (record) {
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP has expired / የOTP ጊዜው አልፏል' });
    }

    if (record.otp === otp) {
      otpStore.delete(email);
      return res.status(200).json({ success: true, message: 'Email verified successfully / ኢሜይልዎ በስኬት ተረጋገጠ!' });
    }
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > NOW()',
      [email, otp]
    );

    if (rows.length > 0) {
      await db.query('DELETE FROM otps WHERE email = ?', [email]);
      return res.status(200).json({ success: true, message: 'Email verified successfully / ኢሜይልዎ በስኬት ተረጋገጠ!' });
    }
  } catch (dbErr) {
    console.error('DB Verification Error:', dbErr);
  }

  return res.status(400).json({ success: false, message: 'Invalid or expired OTP code / የተሳሳተ ወይም ጊዜው ያለፈበት OTP' });
});

// ==========================================
// 3. USER REGISTRATION API (Unified & Safe)
// ==========================================
app.post('/api/register', async (req, res) => {
  console.log("➡️ Registration Payload Received:", req.body);

  const { full_name, fullName, email, password, phone, phoneNumber, role = 'job_seeker', skills = '' } = req.body;

  const userFullName = full_name || fullName;
  const userPhone = phone || phoneNumber;

  if (!userFullName) {
    return res.status(400).json({ message: 'Full Name is missing / ሙሉ ስም አልተገኘም' });
  }
  if (!email) {
    return res.status(400).json({ message: 'Email is missing / ኢሜይል አልተገኘም' });
  }
  if (!password) {
    return res.status(400).json({ message: 'Password is missing / የይለፍ ቃል አልተገኘም' });
  }

  try {
    const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already exists / ክንተን ኢሜይል ከዚህ ቀደም ተመዝግቧል' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const query = 'INSERT INTO users (full_name, email, phone, password, role, skills) VALUES (?, ?, ?, ?, ?, ?)';
    await db.query(query, [userFullName, email, userPhone || '', hashedPassword, role, skills]);

    res.status(201).json({ 
      success: true,
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

// ==========================================
// 4. USER LOGIN API
// ==========================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password / እባክዎ ኢሜይል እና ፓስወርድ ያስገቡ' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password / የተሳሳተ ኢሜይል ወይም ፓስወርድ' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password / የተሳሳተ ኢሜይል ወይም ፓስወርድ' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful / በተሳካ ሁኔታ ገብተዋል',
      token,
      is_verified: Boolean(user.is_verified),
      needsVerification: !user.is_verified,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        skills: user.skills,
        is_verified: Boolean(user.is_verified),
      },
    });


  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
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

console.log("Email Pass Length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "ባዶ ነው");

console.log("Email User:", process.env.EMAIL_USER);