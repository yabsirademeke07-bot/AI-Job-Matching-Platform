const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./connection'); // ከ connection.js ጋር ያገናኛል

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // JSON መረጃዎችን ለመቀበል
app.use(express.urlencoded({ extended: true }));

// Uploads ፎልደር ከሌለ በራሱ እንዲፈጥር ማድረግ
const uploadDir = path.join(__dirname, 'uploads/cvs');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Upload የተደረጉ CVዎችን በ URL ተደራሽ ማድረግ (Static Access)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';

// ==========================================
// ⚙️ MULTER FILE UPLOAD SETUP FOR CVs
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
    limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB Limit
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
// 🛡️ AUTHENTICATION MIDDLEWARE (JWT Verification)
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
        req.user = decoded; // { id, email, role }
        next();
    } catch (error) {
        return res.status(401).json({ 
            message: 'Invalid or expired token / የቆየ ወይም የተሳሳተ Token' 
        });
    }
};

// ==========================================
// 💡 HELPER: Dynamic Smart Skill Matching Engine
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
    return Math.max(score, 35); // Base minimum match threshold
}

// ==========================================
// 1. USER REGISTRATION API (የተጠቃሚዎች ምዝገባ)
// ==========================================
app.post('/api/register', async (req, res) => {
    const { full_name, email, password, role, skills } = req.body;

    if (!full_name || !email || !password || !role) {
        return res.status(400).json({ message: 'Please fill all fields / እባክዎ ሁሉንም መረጃዎች ያሟሉ' });
    }

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already exists / ይህ ኢሜይል ከዚህ ቀደም ተመዝግቧል' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (full_name, email, password, role, skills) VALUES (?, ?, ?, ?, ?)';
        await db.query(query, [full_name, email, hashedPassword, role, skills || '']);

        res.status(201).json({ message: 'User registered successfully / ተጠቃሚው በተሳካ ሁኔታ ተመዝግቧል!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
    }
});

// ==========================================
// 2. USER LOGIN API (የተጠቃሚዎች መግቢያ)
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
            token: token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                skills: user.skills
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
    }
});

// ==========================================
// 3. CREATE JOB API (ሥራ ማስታወቂያ መለጠፊያ)
// ==========================================
app.post('/api/jobs', authenticateUser, async (req, res) => {
    const { title, company, description, category, location, salary, required_skills } = req.body;
    const employer_id = req.user.id; // ከ JWT Token የሚወሰድ

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
        console.error(error);
        res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
    }
});

// ==========================================
// 4. GET ALL JOBS API (ሁሉንም የተለቀቁ ሥራዎች ማውጫ)
// ==========================================
app.get('/api/jobs', async (req, res) => {
    try {
        const [jobs] = await db.query('SELECT jobs.*, users.full_name as employer_name FROM jobs JOIN users ON jobs.employer_id = users.id ORDER BY created_at DESC');
        res.status(200).json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
    }
});

// ==========================================
// 5. APPLY FOR A JOB API (ከ CV Upload እና AI Match Score ጋር) - [PROTECTED]
// ==========================================
app.post('/api/applications', authenticateUser, upload.single('resume'), async (req, res) => {
    const { job_id } = req.body;
    const job_seeker_id = req.user.id; // ከ Token የመጣ ID

    if (!job_id) {
        return res.status(400).json({ message: 'Missing job ID / የሥራው መለያ አልተገኘም' });
    }

    try {
        // Role ማረጋገጥ
        const userRole = (req.user.role || '').toLowerCase().trim();
        if (userRole === 'employer') {
            return res.status(403).json({ message: 'Only job seekers can apply / ማመልከት የሚችሉት ሥራ ፈላጊዎች ብቻ ናቸው' });
        }

        // 1. አመልካቹን ማረጋገጥ እና Skills መውሰድ
        const [seeker] = await db.query('SELECT skills FROM users WHERE id = ?', [job_seeker_id]);
        if (seeker.length === 0) {
            return res.status(404).json({ message: 'User not found / ተጠቃሚው አልተገኘም' });
        }

        // 2. የስራውን መረጃ እና Required Skills መውሰድ
        const [job] = await db.query('SELECT required_skills FROM jobs WHERE id = ?', [job_id]);
        if (job.length === 0) {
            return res.status(404).json({ message: 'Job not found / ሥራው አልተገኘም' });
        }

        // 3. ቀደም ብሎ ያመለከተ መሆኑን ማረጋገጥ
        const [existing] = await db.query('SELECT * FROM applications WHERE job_id = ? AND job_seeker_id = ?', [job_id, job_seeker_id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You have already applied for this job / ለዚህ ሥራ ቀደም ብለው አመልክተዋል' });
        }

        // 4. CV File Path ማዘጋጀት
        const resumeUrl = req.file ? `/uploads/cvs/${req.file.filename}` : '';

        // 5. Smart Matching Score ማሰላት
        const matchScore = calculateRealMatch(seeker[0].skills, job[0].required_skills);

        // 6. ማመልከቻውን ዳታቤዝ ማስገባት
        const query = 'INSERT INTO applications (job_id, job_seeker_id, match_score, resume_url) VALUES (?, ?, ?, ?)';
        await db.query(query, [job_id, job_seeker_id, matchScore, resumeUrl]);

        res.status(201).json({ 
            message: 'Application submitted successfully / ማመልከቻዎ በተሳካ ሁኔታ ተልኳል!',
            matchScore: matchScore,
            resumeUrl: resumeUrl
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
    }
});

// ==========================================
// 6. GET APPLICATIONS FOR A JOB (አመልካቾችን በ AI Score ደርድሮ ማሳያ)
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
        console.error(error);
        res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
    }
});

// ሰርቨሩን ማስነሻ ኮድ
app.listen(PORT, () => {
    console.log(`🚀 Server is running perfectly on port ${PORT} :)`);
});