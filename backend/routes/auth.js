const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../connection'); // Database Connection Path
const { validateSignUp } = require('../middleware/validateAuth');
const { issueOtp, generateAndSendOtp } = require('../services/otpService');

const router = express.Router();
const ADMIN_EMAILS = new Set(['tekebaaweke32@gmail.com']);
const resolveEffectiveRole = (role, email) => {
  const targetEmail = String(email || '').trim().toLowerCase();
  if (ADMIN_EMAILS.has(targetEmail)) return 'admin';
  const value = String(role || 'job_seeker').trim().toLowerCase();
  return ['super_admin', 'admin', 'employer', 'job_seeker'].includes(value) ? value : 'job_seeker';
};

// ==========================================
// 1. የ Nodemailer Email Transporter ማዘጋጀት
// ==========================================
router.post('/signup', validateSignUp, async (req, res) => {
  const { fullName, email, password, phone, role } = req.body;
  const selectedRole = ADMIN_EMAILS.has(String(email || '').trim().toLowerCase())
    ? 'admin'
    : (role === 'employer' || role === 'job_seeker' ? role : 'job_seeker');

  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: 'Full name, email, and password are required' });
  }

  let connection;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      'SELECT id, email, is_verified FROM users WHERE email = ? FOR UPDATE',
      [cleanEmail]
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    let targetUserId = null;

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      if (existingUser.is_verified === 1 || existingUser.is_verified === true) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          isAlreadyVerified: true,
          message: 'ይህ ኢሜይል አስቀድሞ ተመዝግቧል። እባክዎ በቀጥታ ይግቡ (Email is already registered. Please login).'
        });
      }

      targetUserId = existingUser.id;
      await connection.execute(
        `UPDATE users
         SET full_name = ?, phone = ?, password = ?, role = ?, is_verified = FALSE, auth_status = 'pending_verification', is_active = TRUE
         WHERE id = ?`,
        [cleanName, phone || null, hashedPassword, selectedRole, targetUserId]
      );

      await connection.execute(
        'UPDATE otps SET is_used = TRUE WHERE email = ? AND is_used = FALSE',
        [cleanEmail]
      );

      console.log(`🔄 [UNVERIFIED USER UPDATED]: Re-initiating registration for ${cleanEmail} (ID: ${targetUserId})`);
    } else {
      const [result] = await connection.execute(
        `INSERT INTO users (full_name, email, phone, password, role, is_verified, auth_status, is_active)
         VALUES (?, ?, ?, ?, ?, FALSE, 'pending_verification', TRUE)`,
        [cleanName, cleanEmail, phone || null, hashedPassword, selectedRole]
      );

      targetUserId = result.insertId;
      console.log(`✨ [NEW USER INSERTED]: Created pending user ${cleanEmail} (ID: ${targetUserId})`);
    }

    await generateAndSendOtp({
      dbClient: connection,
      email: cleanEmail,
      phone,
      purpose: 'registration',
      recipientName: cleanName,
    });

    await connection.commit();

    return res.status(existingUsers.length > 0 ? 201 : 201).json({
      success: true,
      requiresOtp: true,
      email: cleanEmail,
      userId: targetUserId,
      role: selectedRole,
      message: existingUsers.length > 0
        ? 'ያልተጠናቀቀ ምዝገባ ተገኝቷል። አዲስ የማረጋገጫ ኮድ ተልኳል።'
        : 'የማረጋገጫ ኮድ ወደ ኢሜይልዎ ተልኳል! (Verification code sent to your email)'
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Signup Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  } finally {
    if (connection) connection.release();
  }
});

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

// 3. Google OAuth Callback (Google Auth -> Frontend callback)
// ==========================================
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=auth_failed`,
    session: false,
  }),
  async (req, res) => {
    try {
      const user = req.user;
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

      if (!user || !user.email) {
        return res.redirect(`${clientUrl}/login?error=no_user_found`);
      }

      const normalizedRole = String(user.role || 'job_seeker').trim().toLowerCase().replace(/[\s-]+/g, '_');
      const seekerRoles = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'];
      const employerRoles = ['employer', 'company', 'recruiter'];

      const [cvRows] = await db.query('SELECT id FROM cvs WHERE user_id = ? LIMIT 1', [user.id]);
      const [profileRows] = await db.query('SELECT id, profile_completion_percentage, headline, bio, location, city FROM job_seeker_profiles WHERE user_id = ? LIMIT 1', [user.id]);
      const [companyRows] = await db.query('SELECT id, company_name, industry, location, description FROM company_profiles WHERE employer_id = ? LIMIT 1', [user.id]);
      const hasCv = cvRows.length > 0 || Boolean(user.cvFileName || user.resumeName);
      const seekerProfile = profileRows[0];
      const companyProfile = companyRows[0];
      const roleWasSelected = Boolean(user.googleNewUser === false || seekerProfile || companyProfile);
      const hasProfile = Boolean(
        user.onboardingProfileCompleted ||
        user.profileComplete ||
        (seekerProfile && (Number(seekerProfile.profile_completion_percentage) >= 80 || (seekerProfile.headline && seekerProfile.bio && (seekerProfile.location || seekerProfile.city)))) ||
        (companyProfile && companyProfile.company_name && companyProfile.industry && companyProfile.location && companyProfile.description)
      );

      let redirectStep = 'select_role';

      if (!roleWasSelected) {
        redirectStep = 'select_role';
      } else if (employerRoles.includes(normalizedRole)) {
        redirectStep = hasProfile ? 'employer/dashboard' : 'employer/onboarding';
      } else if (seekerRoles.includes(normalizedRole)) {
        if (!hasCv) {
          redirectStep = 'seeker/cv-upload';
        } else if (!hasProfile) {
          redirectStep = 'seeker/personal-info';
        } else {
          redirectStep = 'seeker/dashboard';
        }
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role || 'job_seeker' },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '7d' }
      );

      const serializedUser = encodeURIComponent(JSON.stringify({
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role || 'job_seeker',
        isVerified: true,
        is_verified: true,
        onboardingRoleSelected: roleWasSelected,
        onboardingCvUploaded: hasCv,
        onboardingProfileCompleted: hasProfile,
        auth_provider: user.auth_provider || 'google',
        googleNewUser: Boolean(user.googleNewUser),
      }));

      return res.redirect(
        `${clientUrl}/auth/callback?token=${token}&user=${serializedUser}&step=${redirectStep}`
      );
    } catch (error) {
      console.error('OAuth Callback Error:', error);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=server_error`);
    }
  }
);

// ==========================================
// 4. የተላከውን OTP ማረጋገጫ Route
// ==========================================
router.post('/verify-otp', async (req, res) => {
  const { email, otp, role } = req.body;
  const selectedRole = role === 'employer' || role === 'job_seeker' ? role : null;

  try {
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required / ኢሜይል እና OTP ያስፈልጋሉ' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // 1. OTP ኮዱን በ DB መፈለግ - የቅርብ ቀኑ ያልተጠቀሰ እና ጊዜው ያልፈቀደ የሆነ ተራ አንድ ኮድ ብቻ
    const [rows] = await db.query(
      'SELECT id, otp_code, expires_at, is_used FROM otps WHERE email = ? AND is_used = FALSE ORDER BY created_at DESC LIMIT 1',
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code / የተሳሳተ ወይም ጊዜው ያለፈበት OTP' });
    }

    const otpRecord = rows[0];
    const expiresAt = new Date(otpRecord.expires_at);

    if (new Date() > expiresAt) {
      await db.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({ success: false, message: 'OTP has expired / የ OTP ጊዜው አልፎበታል' });
    }

    if (otpRecord.otp_code !== cleanOtp) {
      const nextAttempts = Number(otpRecord.attempts || 0) + 1;
      await db.query('UPDATE otps SET attempts = ?, is_used = ? WHERE id = ?', [nextAttempts, nextAttempts >= 5, otpRecord.id]);
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code / የተሳሳተ ወይም ጊዜው ያለፈበት OTP' });
    }

    // 2. OTP ከተረጋገጠ በኋላ ከ DB መሰረዝ አይደለም - እንደ ተጠቃሚ ምልክት ያድርጉ
    await db.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRecord.id]);

    // 3. የተጠቃሚውን መረጃ ማውጣት
    const [userRows] = await db.query('SELECT id, full_name, email, role FROM users WHERE email = ?', [cleanEmail]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found / ተጠቃሚው አልተገኘም' });
    }

    const user = userRows[0];
    const effectiveRole = resolveEffectiveRole(user.role, user.email);

    if (selectedRole && selectedRole !== user.role) {
      await db.execute("UPDATE users SET role = ?, is_verified = TRUE, auth_status = 'active' WHERE id = ?", [selectedRole, user.id]);
      user.role = selectedRole;
    } else {
      await db.execute("UPDATE users SET role = ?, is_verified = TRUE, auth_status = 'active' WHERE id = ?", [effectiveRole, user.id]);
      user.role = effectiveRole;
    }

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
      user: { ...user, is_verified: true, isEmailVerified: true },
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
    const [users] = await db.query('SELECT phone FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const { delivery } = await issueOtp({ dbClient: db, email: email.trim().toLowerCase(), phone: users[0].phone, purpose: 'registration' });

    res.status(200).json({ 
      success: true,
      delivery: { emailSent: delivery.email, smsSent: delivery.sms },
      message: 'A new OTP has been sent to your email / አዲስ OTP ወደ ኢሜይልዎ ተልኳል!' 
    });

  } catch (error) {
    console.error('Resend OTP Error:', error);
    if (error.code === 'OTP_RATE_LIMITED') {
      return res.status(429).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to resend OTP / OTP እንደገና መላክ አልተቻለም' });
  }
});

// ==========================================
// 6. የተጠቃሚውን Role መምረጫ Route (ለ Select Role Page)
// ==========================================
router.post(['/select-role', '/set-role'], async (req, res) => {
  const { userId, email, role, companyName } = req.body;

  let connection;
  try {
    if (!role || !['employer', 'job_seeker'].includes(role)) {
      return res.status(422).json({ success: false, message: 'እባክዎ ትክክለኛ ሚና ይምረጡ (Please select either Job Seeker or Employer).' });
    }
    if (!userId && !email) {
      return res.status(400).json({ success: false, message: 'User identifier is required.' });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    const [users] = await connection.execute(
      userId ? 'SELECT id, full_name, email, role, is_verified FROM users WHERE id = ? FOR UPDATE' : 'SELECT id, full_name, email, role, is_verified FROM users WHERE email = ? FOR UPDATE',
      [userId || String(email).trim().toLowerCase()]
    );
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'ተጠቃሚው አልተገኘም (User not found).' });
    }

    const targetUser = users[0];
    if (!targetUser.is_verified) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Please verify your email before selecting a role.' });
    }

    await connection.execute('UPDATE users SET role = ? WHERE id = ?', [role, targetUser.id]);

    if (role === 'employer') {
      await connection.execute(
        `INSERT INTO company_profiles (employer_id, company_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE company_name = VALUES(company_name)`,
        [targetUser.id, companyName?.trim() || `${targetUser.full_name}'s Company`]
      );
    } else {
      await connection.execute(
        'INSERT INTO job_seeker_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)',
        [targetUser.id]
      );
    }

    await connection.execute(
      "INSERT INTO user_activity_log (user_id, activity_type) VALUES (?, 'role_selected')",
      [targetUser.id]
    );
    await connection.commit();

    const token = jwt.sign(
      { id: targetUser.id, role, email: targetUser.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true, 
      message: 'ሚናዎ በተሳካ ሁኔታ ተመዝግቧል! (Role updated successfully)',
      user: {
        id: targetUser.id,
        fullName: targetUser.full_name,
        full_name: targetUser.full_name,
        email: targetUser.email,
        role,
        is_verified: Boolean(targetUser.is_verified),
      },
      token
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Set Role Error:', error);
    res.status(500).json({ success: false, message: 'Unable to save role selection.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;