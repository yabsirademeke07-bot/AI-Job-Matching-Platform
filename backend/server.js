const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./connection'); // ከ connection.js ጋር በትክክል ያገናኛል

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // JSON መረጃዎችን ለመቀበል

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';

// ==========================================
// 1. USER REGISTRATION API (የተጠቃሚዎች ምዝገባ)
// ==========================================
app.post('/api/register', async (req, res) => {
    const { full_name, email, password, role } = req.body;

    // መረጃዎች መሞላታቸውን ማረጋገጥ
    if (!full_name || !email || !password || !role) {
        return res.status(400).json({ message: 'Please fill all fields / እባክዎ ሁሉንም መረጃዎች ያሟሉ' });
    }

    try {
        // ኢሜይሉ ከዚህ በፊት መመዝገቡን ማረጋገጥ
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email already exists / ይህ ኢሜይል ከዚህ ቀደም ተመዝግቧል' });
        }

        // የይለፍ ቃሉን በደህንነት መቆለፍ (Hash Password)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ዳታቤዝ ውስጥ ማስገባት
        const query = 'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)';
        await db.query(query, [full_name, email, hashedPassword, role]);

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

    // መረጃዎቹ መሞላታቸውን ማረጋገጥ
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password / እባክዎ ኢሜይል እና ፓስወርድ ያስገቡ' });
    }

    try {
        // ተጠቃሚው በኢሜይሉ ዳታቤዝ ውስጥ መኖሩን መፈለግ
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password / የተሳሳተ ኢሜይል ወይም ፓስወርድ' });
        }

        const user = users[0];

        // የይለፍ ቃሉን (Password) በbcrypt ማወዳደር
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password / የተሳሳተ ኢሜይል ወይም ፓስወርድ' });
        }

        // ለተጠቃሚው JWT Token ማዘጋጀት (ለ 1 ሰዓት የሚቆይ)
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // በተሳካ ሁኔታ መግባቱን መመለስ
        res.status(200).json({
            message: 'Login successful / በተሳካ ሁኔታ ገብተዋል',
            token: token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error / የሰርቨር ስህተት አጋጥሟል' });
    }
});

// ሰርቨሩን ማስነሻ ኮድ
app.listen(PORT, () => {
    console.log(`Server is running perfectly on port ${PORT} :)`);
});