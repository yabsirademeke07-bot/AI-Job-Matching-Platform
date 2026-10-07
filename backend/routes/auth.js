const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../connection'); // Database Connection Path
const { validateSignUp } = require('../middleware/validateAuth');
const { issueOtp, generateAndSendOtp, deliverOtpEmail } = require('../services/otpService');

const router = express.Router();
const ADMIN_EMAILS = new Set(['tekebaaweke32@gmail.com']);
const requireGoogleOAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend environment, then restart the server.',
    });
  }
  next();
};
const resolveEffectiveRole = (role, email) => {
  const targetEmail = String(email || '').trim().toLowerCase();
  if (ADMIN_EMAILS.has(targetEmail)) return 'admin';
  const value = String(role || 'job_seeker').trim().toLowerCase();
  return ['super_admin', 'admin', 'employer', 'job_seeker'].includes(value) ? value : 'job_seeker';
};
const logOtpRequest = (req) => {
  console.log('🚀 [OTP DEBUG] Received request:', {
    path: req.originalUrl,
    bodyKeys: Object.keys(req.body || {}),
    emailDefined: Boolean(req.body?.email),
  });
};

const findLoginUser = async (email) => {
  const [rows] = await db.query(
    'SELECT id, full_name, email, password, role, is_verified, phone, is_active, last_active_page, last_state_payload FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
};

const getLoginUserDetails = async (user) => {
  const [cvRows] = await db.query(
    'SELECT id FROM cvs WHERE user_id = ? AND is_active = TRUE LIMIT 1',
    [user.id]
  );
  const hasCv = cvRows.length > 0;
  const { password: ignoredPassword, phone: ignoredPhone, is_active: ignoredActive, ...safeUser } = user;
  return {
    ...safeUser,
    has_cv: hasCv,
    onboarding_step: user.role === 'job_seeker' && !hasCv ? 'cv_upload' : null,
  };
};

const initiateLoginOtp = async (req, res) => {
  logOtpRequest(req);
  const cleanEmail = String(req.body.email || '').trim().toLowerCase();
  if (!cleanEmail) return res.status(400).json({ success: false, message: 'Email is required.' });

  try {
    const user = await findLoginUser(cleanEmail);
    if (!user || !user.is_active) return res.status(404).json({ success: false, message: 'No account found with this email.' });
    if (req.body.password && (!user.password || !(await bcrypt.compare(req.body.password, user.password)))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.is_verified) {
      const otpResult = await issueOtp({ dbClient: db, email: cleanEmail, phone: user.phone, purpose: 'registration', expiresInMinutes: 1 });
      const payload = {
        success: false,
        requires_verification: true,
        email: cleanEmail,
        emailDelivered: otpResult.delivery.email,
        emailError: otpResult.delivery.emailError,
        message: 'Your account is not verified. A new verification code has been sent to your email.'
      };
      if (process.env.NODE_ENV === 'development') payload.devOtp = otpResult.otpCode;
      return res.status(403).json(payload);
    }

    const otpResult = await issueOtp({ dbClient: db, email: cleanEmail, phone: user.phone, purpose: 'login', expiresInMinutes: 1 });
    const payload = {
      success: true,
      requires_otp: true,
      email: cleanEmail,
      emailDelivered: otpResult.delivery.email,
      emailError: otpResult.delivery.emailError,
      message: 'OTP verification code sent to your email.',
    };
    if (process.env.NODE_ENV === 'development') payload.devOtp = otpResult.otpCode;
    return res.json(payload);
  } catch (error) {
    console.error('❌ [OTP LOGIN ERROR]:', error);
    if (error.code === 'OTP_RATE_LIMITED') {
      try {
        const [activeOtps] = await db.query(
          `SELECT expires_at FROM otps
           WHERE email = ? AND purpose = 'login' AND is_used = 0
           ORDER BY id DESC LIMIT 1`,
          [cleanEmail]
        );
        if (activeOtps.length > 0 && new Date(activeOtps[0].expires_at).getTime() > Date.now()) {
          const expiresAt = new Date(activeOtps[0].expires_at).getTime();
          return res.status(200).json({
            success: true,
            requires_otp: true,
            active_code: true,
            email: cleanEmail,
            retry_after_seconds: Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
            message: 'A valid login code is already active. Enter that code to continue.',
          });
        }
      } catch (lookupError) {
        console.error('❌ [ACTIVE LOGIN OTP LOOKUP ERROR]:', lookupError);
        return res.status(500).json({
          success: false,
          error: lookupError.message,
          ...(process.env.NODE_ENV !== 'production' ? { stack: lookupError.stack } : {}),
        });
      }
      return res.status(429).json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
    });
  }
};

router.post(['/login', '/login-init', '/send-login-otp'], initiateLoginOtp);

router.post('/verify-login-otp', async (req, res) => {
  logOtpRequest(req);
  const cleanEmail = String(req.body.email || '').trim().toLowerCase();
  const enteredOtp = String(req.body.otp_code || req.body.otp || '').trim();
  if (!cleanEmail || !/^\d{6}$/.test(enteredOtp)) return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });

  try {
    const isDevelopmentMasterCode = process.env.NODE_ENV === 'development' && enteredOtp === '123456';
    if (!isDevelopmentMasterCode) {
      const [rows] = await db.query(
        `SELECT * FROM otps
          WHERE email = ? AND is_used = 0 AND purpose = 'login'
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
      const isNotExpired = new Date(otpRecord.expires_at).getTime() > Date.now();
      if (!isNotExpired) {
        await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);
        return res.status(400).json({ success: false, error: 'This OTP code has expired. Please request a new one.' });
      }

      if (Number(otpRecord.attempts || 0) >= 4) {
        return res.status(429).json({ success: false, error: 'Too many failed attempts. For your security, please wait 15 minutes before requesting a new code.' });
      }

      if (String(otpRecord.otp_code).trim() !== enteredOtp) {
        const nextAttempts = Number(otpRecord.attempts || 0) + 1;
        await db.query('UPDATE otps SET attempts = ? WHERE id = ?', [nextAttempts, otpRecord.id]);
        const remaining = 4 - nextAttempts;

        if (remaining <= 0) {
          return res.status(429).json({ success: false, error: 'Too many failed attempts. Please wait 15 minutes before trying again.' });
        }

        return res.status(400).json({ success: false, error: `Invalid OTP code. You have ${remaining} attempt(s) remaining.` });
      }

      await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);
      console.log('--> [SUCCESS] OTP marked as is_used = 1 in database for ID:', otpRecord.id);
    } else {
      console.warn('[OTP DEV BYPASS] Development master OTP accepted for login verification.');
    }

    const user = await findLoginUser(cleanEmail);
    if (!user || !user.is_active) return res.status(404).json({ success: false, message: 'No account found with this email.' });
    if (isDevelopmentMasterCode && !user.is_verified) {
      await db.query("UPDATE users SET is_verified = TRUE, auth_status = 'active' WHERE id = ?", [user.id]);
      user.is_verified = true;
    }
    const safeUser = await getLoginUserDetails(user);
    await db.query("INSERT INTO user_activity_log (user_id, activity_type) VALUES (?, 'login')", [user.id]);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '7d' });
    return res.json({
      success: true,
      token,
      user: safeUser,
      requiresRoleSelection: true,
      onboarding_step: 'role_selection',
      redirect_to: '/select-role',
    });
  } catch (error) {
    console.error('❌ [LOGIN OTP VERIFY ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to verify login OTP.',
      ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
    });
  }
});

// ==========================================
// 1. የ Nodemailer Email Transporter ማዘጋጀት
// ==========================================
router.post('/signup', (req, _res, next) => {
  logOtpRequest(req);
  next();
}, validateSignUp, async (req, res) => {
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

    const otpResult = await generateAndSendOtp({
      dbClient: connection,
      email: cleanEmail,
      phone,
      purpose: 'registration',
      recipientName: cleanName,
      deferEmail: true,
    });

    await connection.commit();
    try {
      otpResult.delivery = await deliverOtpEmail(cleanEmail, otpResult.otpCode);
    } catch (deliveryError) {
      try {
        await connection.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpResult.otpId]);
      } catch (invalidateError) {
        console.error('❌ [OTP INVALIDATION ERROR]:', invalidateError);
        deliveryError.cause = new AggregateError(
          [deliveryError.cause, invalidateError].filter(Boolean),
          'Email delivery failed and the undelivered OTP could not be invalidated.'
        );
      }
      deliveryError.status = 502;
      throw deliveryError;
    }

    const response = {
      success: true,
      requiresOtp: true,
      email: cleanEmail,
      userId: targetUserId,
      role: selectedRole,
      emailDelivered: otpResult.delivery.email,
      emailError: otpResult.delivery.emailError,
      message: otpResult.delivery.email
        ? existingUsers.length > 0
          ? 'ያልተጠናቀቀ ምዝገባ ተገኝቷል። አዲስ የማረጋገጫ ኮድ ተልኳል።'
          : 'የማረጋገጫ ኮድ ወደ ኢሜይልዎ ተልኳል! (Verification code sent to your email)'
        : otpResult.delivery.emailError || 'Account created, but email delivery failed. Check your email settings and resend the verification code.'
    };
    if (process.env.NODE_ENV === 'development') response.devOtp = otpResult.otpCode;

    return res.status(existingUsers.length > 0 ? 201 : 201).json(response);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('❌ [OTP SIGNUP ERROR]:', error);
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Server error',
      ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
    });
  } finally {
    if (connection) connection.release();
  }
});

// ==========================================
// 2. የ Google Login ማስጀመሪያ Route
// ==========================================
router.get('/google', requireGoogleOAuth, (req, res, next) => {
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
  requireGoogleOAuth,
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
      const [companyRows] = await db.query('SELECT id, company_name, industry, headquarters_location AS location, about_company AS description FROM employers WHERE user_id = ? OR userId = ? LIMIT 1', [user.id, user.id]);
      const [householdRows] = await db.query('SELECT id, household_name AS company_name, industry, residence_location AS location, about_household AS description FROM household_employers WHERE user_id = ? LIMIT 1', [user.id]);
      const hasCv = cvRows.length > 0 || Boolean(user.cvFileName || user.resumeName);
      const seekerProfile = profileRows[0];
      const companyProfile = companyRows[0] || householdRows[0];
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
  logOtpRequest(req);
  const { email, otp, role } = req.body;
  const enteredOtp = String(req.body.otp_code || req.body.otp || '').trim();
  const selectedRole = role === 'employer' || role === 'job_seeker' ? role : null;

  try {
    if (!email || !enteredOtp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (!/^\d{6}$/.test(enteredOtp)) {
      return res.status(400).json({ success: false, message: 'OTP must be a 6-digit number.' });
    }

    const [userRows] = await db.query(
      `SELECT id, full_name, email, role, is_active, is_verified, last_active_page, last_state_payload
       FROM users WHERE email = ? LIMIT 1`,
      [cleanEmail]
    );
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'This account is inactive.' });
    }

    const isDevelopmentMasterCode = process.env.NODE_ENV === 'development' && enteredOtp === '123456';
    if (!isDevelopmentMasterCode) {
      const [otpRows] = await db.query(
        `SELECT id, otp_code, attempts, expires_at
         FROM otps
         WHERE email = ? AND purpose IN ('registration', 'email-verification')
           AND is_used = 0
         ORDER BY id DESC LIMIT 1`,
        [cleanEmail]
      );
      if (!otpRows.length) {
        return res.status(400).json({ success: false, error: 'No active verification code found. Please request a new one.' });
      }
      const otpRecord = otpRows[0];
      const isNotExpired = new Date(otpRecord.expires_at).getTime() > Date.now();
      if (!isNotExpired) {
        await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);
        return res.status(400).json({ success: false, error: 'This OTP code has expired. Please request a new one.' });
      }
      if (Number(otpRecord.attempts || 0) >= 4) {
        return res.status(429).json({ success: false, error: 'Too many failed attempts. Please request a new code later.' });
      }
      if (String(otpRecord.otp_code).trim() !== enteredOtp) {
        const nextAttempts = Number(otpRecord.attempts || 0) + 1;
        await db.query('UPDATE otps SET attempts = ? WHERE id = ?', [nextAttempts, otpRecord.id]);
        return res.status(nextAttempts >= 4 ? 429 : 400).json({
          success: false,
          error: nextAttempts >= 4 ? 'Too many failed attempts. Please request a new code later.' : 'Invalid OTP code.',
        });
      }

      await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);
    } else {
      console.warn('[OTP DEV BYPASS] Development master OTP accepted for registration verification.');
    }

    const effectiveRole = resolveEffectiveRole(user.role || selectedRole || 'job_seeker', user.email);
    const finalRole = selectedRole && selectedRole !== user.role ? selectedRole : effectiveRole;
    await db.execute("UPDATE users SET role = ?, is_verified = TRUE, auth_status = 'active' WHERE id = ?", [finalRole, user.id]);

    const [cvRows] = await db.query(
      'SELECT id, is_active FROM cvs WHERE user_id = ? AND is_active = TRUE LIMIT 1',
      [user.id]
    );

    const hydratedUser = {
      ...user,
      role: finalRole,
      has_cv: cvRows.length > 0,
      is_verified: true,
      isEmailVerified: true,
      onboarding_step: finalRole === 'job_seeker' && cvRows.length === 0 ? 'cv_upload' : null,
    };

    const token = jwt.sign(
      { id: user.id, role: finalRole, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully!',
      token,
      user: hydratedUser,
      requiresRoleSelection: !finalRole || finalRole === 'pending',
      onboarding_step: hydratedUser.onboarding_step,
    });
  } catch (error) {
    console.error('❌ [OTP VERIFY ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Server error',
      ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
    });
  }
});

// ==========================================
// 5. RESEND OTP ROUTE
// ==========================================
const resendOtp = async (req, res) => {
  logOtpRequest(req);
  const { email, purpose = 'registration' } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required / እባክዎ ኢሜይል ያስገቡ' });
  }

  try {
    const [users] = await db.query('SELECT phone FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const otpResult = await issueOtp({ dbClient: db, email: cleanEmail, phone: users[0].phone, purpose, expiresInMinutes: 1 });
    const { delivery } = otpResult;

    if (!delivery.email) {
      const response = {
        success: true,
        delivery: { emailSent: false, smsSent: delivery.sms },
        emailDelivered: false,
        emailError: delivery.emailError,
        message: delivery.emailError || 'Email delivery failed. Check the backend SMTP configuration and server logs, then try again.',
      };
      if (process.env.NODE_ENV === 'development') response.devOtp = otpResult.otpCode;
      return res.status(200).json(response);
    }

    const response = {
      success: true,
      delivery: { emailSent: true, smsSent: delivery.sms },
      emailDelivered: true,
      message: 'A new OTP has been sent to your email.',
    };
    if (process.env.NODE_ENV === 'development') response.devOtp = otpResult.otpCode;
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ [OTP RESEND ERROR]:', error);
    if (error.code === 'OTP_RATE_LIMITED') {
      return res.status(429).json({ success: false, message: error.message });
    }
    if (error.code === 'OTP_EMAIL_DELIVERY_FAILED') {
      return res.status(502).json({
        success: false,
        message: error.message || 'Email delivery failed. Check the backend SMTP configuration and server logs, then try again.',
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to resend OTP.',
      ...(process.env.NODE_ENV !== 'production' ? { stack: error.stack } : {}),
    });
  }
};

router.post(['/send-otp', '/resend-otp'], resendOtp);

// ==========================================
// 5. PASSWORD RESET FLOW
// ==========================================
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  try {
    const [userRows] = await db.query('SELECT id, phone, is_active FROM users WHERE email = ? LIMIT 1', [email]);

    if (!userRows || userRows.length === 0 || !userRows[0].is_active) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a verification code has been sent.'
      });
    }

    const user = userRows[0];
    const otpResult = await issueOtp({
      dbClient: db,
      email,
      phone: user.phone,
      purpose: 'password-reset',
      expiresInMinutes: 1,
    });

    const response = {
      success: true,
      message: 'If an account exists for this email, a verification code has been sent.'
    };
    if (process.env.NODE_ENV === 'development') response.devOtp = otpResult.otpCode;
    return res.status(200).json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to send a reset code right now. Please try again later.'
    });
  }
});

router.post('/verify-reset-otp', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const otpCode = String(req.body?.otp || '').trim();

  if (!email || !otpCode || !/^\d{6}$/.test(otpCode)) {
    return res.status(400).json({ success: false, message: 'Please enter the valid 6-digit OTP code.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM otps
       WHERE email = ? AND purpose = 'password-reset' AND is_used = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No active reset code found. Please request a new one.' });
    }

    const otpRecord = rows[0];
    if (new Date() > new Date(otpRecord.expires_at)) {
      await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);
      return res.status(400).json({ success: false, message: 'This reset code has expired. Please request a new one.' });
    }

    if (Number(otpRecord.attempts || 0) >= 4) {
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please wait before requesting a new code.' });
    }

    if (String(otpRecord.otp_code).trim() !== otpCode) {
      const nextAttempts = Number(otpRecord.attempts || 0) + 1;
      await db.query('UPDATE otps SET attempts = ? WHERE id = ?', [nextAttempts, otpRecord.id]);
      const remaining = 4 - nextAttempts;

      if (remaining <= 0) {
        return res.status(429).json({ success: false, message: 'Too many failed attempts. Please wait before trying again.' });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid code. You have ${remaining} attempt(s) remaining.`
      });
    }

    await db.query('UPDATE otps SET is_used = 1 WHERE id = ?', [otpRecord.id]);

    const resetToken = jwt.sign(
      { email, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '30m' }
    );

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken,
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    return res.status(500).json({ success: false, message: 'Unable to verify the reset code.' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword, confirmPassword } = req.body || {};

  if (!resetToken) {
    return res.status(401).json({ success: false, message: 'Your reset session is invalid or expired.' });
  }

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'New password and confirmation are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters and include uppercase, lowercase, and a number.'
    });
  }

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'your_secret_key');

    if (!decoded || decoded.purpose !== 'password-reset' || !decoded.email) {
      return res.status(401).json({ success: false, message: 'Your reset session is invalid or expired.' });
    }

    const email = String(decoded.email).trim().toLowerCase();
    const [userRows] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found for this email.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
    await db.query('UPDATE otps SET is_used = 1 WHERE email = ? AND purpose = ?', [email, 'password-reset']);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.'
    });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Your reset session has expired. Please request a new code.' });
    }

    return res.status(500).json({ success: false, message: 'Unable to reset your password right now.' });
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

    let redirect_to = null;
    let onboarding_step = null;
    if (role === 'job_seeker') {
      const [cvRows] = await connection.execute('SELECT id FROM cvs WHERE user_id = ? AND is_active = TRUE LIMIT 1', [targetUser.id]);
      const [profileRows] = await connection.execute('SELECT id, headline, bio, location, city FROM job_seeker_profiles WHERE user_id = ? LIMIT 1', [targetUser.id]);
      if (cvRows.length === 0) {
        redirect_to = '/seeker/cv-upload';
        onboarding_step = 'cv_upload';
      } else if (!profileRows.length || !profileRows[0].headline || !profileRows[0].bio || !profileRows[0].location || !profileRows[0].city) {
        redirect_to = '/seeker/personal-info';
        onboarding_step = 'personal_info';
      } else {
        redirect_to = '/seeker/dashboard';
        onboarding_step = null;
      }
    } else if (role === 'employer') {
      const [companyRows] = await connection.execute('SELECT id, company_name, tin_number, trade_license_document FROM employers WHERE user_id = ? OR userId = ? LIMIT 1', [targetUser.id, targetUser.id]);
      const [householdRows] = await connection.execute('SELECT id, household_name FROM household_employers WHERE user_id = ? LIMIT 1', [targetUser.id]);
      const employerProfile = companyRows[0] || householdRows[0];
      if (!employerProfile || (!employerProfile.company_name && !employerProfile.household_name) || (role === 'employer' && !householdRows.length && (!employerProfile.tin_number || !employerProfile.trade_license_document))) {
        redirect_to = '/employer/onboarding';
        onboarding_step = 'company_legal';
      } else {
        redirect_to = '/employer/dashboard';
        onboarding_step = null;
      }
    }

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
      token,
      redirect_to,
      onboarding_step,
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