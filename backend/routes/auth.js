const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../connection'); // Database Connection Path

const router = express.Router();

// ==========================================
// 1. የ Nodemailer Email Transporter ማዘጋጀት
// ==========================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 6-digit OTP ማመንጫ Function
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ==========================================
// 2. የ Google Login ማስጀመሪያ Route
// ==========================================
router.get('/google', (req, res, next) => {
  const role = req.query.role || 'pending';
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: role
  })(req, res, next);
});

// ==========================================
// 3. Google OAuth Callback (Google Auth -> OTP Verification)
// ==========================================
router.get(
  '/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=auth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      const user = req.user;
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

      if (!user || !user.email) {
        return res.redirect(`${clientUrl}/login?error=no_user_found`);
      }

      // 1. OTP ማመንጨት እና በ Database ማስቀመጥ (10 ደቂቃ እድሜ ያለው)
      const otpCode = generateOTP();

      try {
        await db.query(
          `INSERT INTO otps (email, otp, expires_at) 
           VALUES (?, ?, NOW() + INTERVAL 10 MINUTE) 
           ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
          [user.email, otpCode]
        );
      } catch (dbErr) {
        console.error("OTP DB Insert Error:", dbErr.message);
      }

      // 2. OTP በኢሜይል መላክ
      try {
        await transporter.sendMail({
          from: `"SmartRecruit AI" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Your SmartRecruit Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1e293b;">Welcome to SmartRecruit AI</h2>
              <p style="color: #475569;">Your OTP verification code is:</p>
              <h1 style="color: #2563eb; letter-spacing: 5px; background: #f1f5f9; padding: 10px; display: inline-block; border-radius: 5px;">${otpCode}</h1>
              <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes.</p>
            </div>
          `
        });
      } catch (mailError) {
        console.error("Mail sending warning (continuing process):", mailError.message);
      }

      // 3. በቀጥታ ወደ Frontend OTP Verification ገፅ Redirect ማድረግ
      const userRole = user.role || 'pending';
      return res.redirect(
        `${clientUrl}/verify-otp?email=${encodeURIComponent(user.email)}&userId=${user.id}&role=${userRole}`
      );

    } catch (error) {
      console.error("OAuth Callback Error:", error);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=server_error`);
    }
  }
);

// ==========================================
// 4. የተላከውን OTP ማረጋገጫ Route
// ==========================================
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required / ኢሜይል እና OTP ያስፈልጋሉ' });
    }

    // 1. OTP ኮዱን በ DB መፈለግ
    const [rows] = await db.query(
      'SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > NOW()',
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code / የተሳሳተ ወይም ጊዜው ያለፈበት OTP' });
    }

    // 2. OTP ከተረጋገጠ በኋላ ከ DB ማጥፋት
    await db.query('DELETE FROM otps WHERE email = ?', [email]);

    // 3. የተጠቃሚውን መረጃ ማውጣት
    const [userRows] = await db.query('SELECT id, full_name, email, role FROM users WHERE email = ?', [email]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found / ተጠቃሚው አልተገኘም' });
    }

    const user = userRows[0];

    // 4. JWT Token ማዘጋጀት
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    // 5. ተጠቃሚው Role የመረጠ መሆኑን ማረጋገጥ
    const requiresRoleSelection = !user.role || user.role === 'pending';

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully / OTP በትክክል ተረጋገጠ!',
      token,
      user,
      requiresRoleSelection
    });

  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
});

// ==========================================
// 5. RESEND OTP ROUTE
// ==========================================
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required / እባክዎ ኢሜይል ያስገቡ' });
  }

  try {
    const newOtpCode = generateOTP();

    await db.query(
      `INSERT INTO otps (email, otp, expires_at) 
       VALUES (?, ?, NOW() + INTERVAL 10 MINUTE) 
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [email, newOtpCode]
    );

    try {
      await transporter.sendMail({
        from: `"SmartRecruit AI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'SmartRecruit AI - Your New OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e293b;">Resend OTP Request</h2>
            <p style="color: #475569;">Your new verification code is:</p>
            <h1 style="color: #2563eb; letter-spacing: 5px; background: #f1f5f9; padding: 10px; display: inline-block; border-radius: 5px;">${newOtpCode}</h1>
            <p style="color: #64748b; font-size: 13px;">This code will expire in 10 minutes.</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.error("Resend Mail error:", mailErr.message);
    }

    res.status(200).json({ 
      success: true, 
      message: 'A new OTP has been sent to your email / አዲስ OTP ወደ ኢሜይልዎ ተልኳል!' 
    });

  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP / OTP እንደገና መላክ አልተቻለም' });
  }
});

// ==========================================
// 6. የተጠቃሚውን Role መምረጫ Route (ለ Select Role Page)
// ==========================================
router.post('/set-role', async (req, res) => {
  const { userId, role } = req.body;

  try {
    if (!userId || !role) {
      return res.status(400).json({ success: false, message: 'User ID and Role are required' });
    }

    const formattedRole = role === 'seeker' ? 'job_seeker' : role;

    const [result] = await db.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [formattedRole, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [rows] = await db.query('SELECT id, full_name, email, role FROM users WHERE id = ?', [userId]);
    const updatedUser = rows[0];

    const token = jwt.sign(
      { id: updatedUser.id, role: updatedUser.role, email: updatedUser.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      success: true, 
      user: updatedUser,
      token
    });

  } catch (error) {
    console.error('Set Role Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;