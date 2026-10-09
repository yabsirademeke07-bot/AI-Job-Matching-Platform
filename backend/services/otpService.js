const crypto = require('crypto');
const { sendEmailOtp } = require('./notificationService');

const MAX_RESENDS_PER_HOUR = 5;
const OTP_EXPIRY_MINUTES = 3;

const createOtp = () => crypto.randomInt(100000, 1000000).toString();

const getEmailDeliveryMessage = (error) => {
  const errorCode = String(error.code || '').toUpperCase();
  const errorDetails = `${error.message || ''} ${error.response || ''}`.toLowerCase();

  if (errorCode === 'SMTP_CONFIG_MISSING' || /credentials are missing|credentials.*not configured|credentials.*placeholder|backend\/\.env/.test(errorDetails)) {
    return 'Email is not configured. Add EMAIL_USER and EMAIL_APP_PASSWORD (a Google App Password) to backend/.env, then restart the backend.';
  }
  if (errorCode === 'EAUTH' || /535|534|username and password not accepted|application-specific password/.test(errorDetails)) {
    return 'Gmail rejected the SMTP credentials. Check that EMAIL_USER is the matching Gmail address and EMAIL_APP_PASSWORD is a valid Google App Password.';
  }
  if (/timeout|timed out|etimedout/.test(`${errorCode} ${errorDetails}`)) {
    return 'Gmail could not be reached before the connection timed out. Check your network/firewall and try again.';
  }
  if (/econnrefused|econnreset|enotfound|ehostunreach|enetunreach|esocket/.test(`${errorCode} ${errorDetails}`)) {
    return 'Could not connect to Gmail SMTP. Check your network/firewall and SMTP settings, then try again.';
  }
  return 'Email delivery failed. Check the backend SMTP configuration and server logs, then try again.';
};

const deliverOtpEmail = async (email, otpCode) => {
  try {
    await sendEmailOtp(email, otpCode);
    console.log(`✅ OTP email dispatched to ${email}.`);
    return { email: true, emailError: null };
  } catch (error) {
    console.error('❌ [EMAIL SEND ERROR] SMTP delivery failed:', error);
    console.warn('⚠️ Email send skipped, proceeding in local development mode.');
    return {
      email: false,
      emailError: getEmailDeliveryMessage(error),
    };
  }
};

const issueOtp = async ({ dbClient, email, phone, purpose = 'registration', expiresInMinutes = OTP_EXPIRY_MINUTES, deferEmail = false }) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Email is required to generate OTP.');
  }

  console.log('💾 [OTP DEBUG] Attempting to save OTP to database for:', cleanEmail);
  const ownsConnection = typeof dbClient.getConnection === 'function';
  const client = ownsConnection ? await dbClient.getConnection() : dbClient;
  let transactionStarted = false;
  let otpId;
  let otp;
  let expiresAt;

  try {
    if (ownsConnection) {
      await client.beginTransaction();
      transactionStarted = true;
    }

    if (process.env.NODE_ENV === 'production') {
      let recentRows;
      [recentRows] = await client.execute(
        `SELECT COUNT(*) AS request_count
         FROM otps
         WHERE email = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [cleanEmail]
      );

      if (Number(recentRows[0]?.request_count || 0) >= MAX_RESENDS_PER_HOUR) {
        const error = new Error('Too many OTP requests. Please try again later.');
        error.code = 'OTP_RATE_LIMITED';
        throw error;
      }
    }

    otp = createOtp();
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 [AFRIWORK-STYLE OTP]:', otp);
    }
    const safeExpiry = Number.isInteger(expiresInMinutes) && expiresInMinutes > 0 ? expiresInMinutes : OTP_EXPIRY_MINUTES;
    expiresAt = new Date(Date.now() + safeExpiry * 60 * 1000);

    await client.query('UPDATE otps SET is_used = 1 WHERE email = ? AND is_used = 0', [cleanEmail]);
    const insertSql = `
      INSERT INTO otps (email, otp_code, purpose, is_used, attempts, expires_at, created_at)
      VALUES (?, ?, ?, 0, 0, ?, NOW())
    `;

    const [insertResult] = await client.query(insertSql, [cleanEmail, otp, purpose, expiresAt]);
    if (!insertResult.insertId) {
      throw new Error('MySQL did not return an OTP insert ID.');
    }
    otpId = insertResult.insertId;

    const [savedRows] = await client.execute(
      `SELECT email, otp_code, is_used, expires_at
       FROM otps
       WHERE id = ?
       LIMIT 1`,
      [otpId]
    );
    const savedOtp = savedRows[0];
    const savedExpiryTime = new Date(savedOtp?.expires_at).getTime();
    if (
      !savedOtp
      || String(savedOtp.email).trim().toLowerCase() !== cleanEmail
      || String(savedOtp.otp_code).trim() !== otp
      || Number(savedOtp.is_used) !== 0
      || !Number.isFinite(savedExpiryTime)
      || savedExpiryTime <= Date.now()
    ) {
      throw new Error('OTP database verification failed: the saved code is missing, used, or expired.');
    }

    console.log(`--> [DATABASE SUCCESS] Active OTP record verified for ${cleanEmail}.`);
    if (ownsConnection) {
      await client.commit();
      transactionStarted = false;
    }
  } catch (dbError) {
    if (ownsConnection && transactionStarted) {
      try {
        await client.rollback();
      } catch (rollbackError) {
        console.error('❌ [OTP TRANSACTION ROLLBACK ERROR]:', rollbackError);
        dbError = new AggregateError([dbError, rollbackError], 'OTP transaction failed and rollback was unsuccessful.');
      }
    }
    console.error('❌ [DATABASE ERROR]:', dbError);
    throw dbError;
  } finally {
    if (ownsConnection) client.release();
  }

  let delivery;
  if (deferEmail) {
    delivery = { email: false, emailError: null, deferred: true };
  } else {
    delivery = await deliverOtpEmail(cleanEmail, otp);
  }

  return {
    otpCode: otp,
    ...(process.env.NODE_ENV === 'development' ? { devOtp: otp } : {}),
    otpId,
    expiresAt,
    delivery: {
      ...delivery,
      sms: false,
    },
  };
};

const generateAndSendOtp = async ({ email, phone, purpose = 'registration', dbClient, recipientName, deferEmail = false }) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Email is required to generate OTP.');
  }

  const client = dbClient || require('../connection');
  const result = await issueOtp({ dbClient: client, email: cleanEmail, phone, purpose, expiresInMinutes: OTP_EXPIRY_MINUTES, deferEmail });

  return {
    success: true,
    email: cleanEmail,
    purpose,
    recipientName,
    otpCode: result.otpCode,
    ...(process.env.NODE_ENV === 'development' ? { devOtp: result.otpCode } : {}),
    otpId: result.otpId,
    delivery: result.delivery,
    emailError: result.delivery.emailError,
    expiresAt: result.expiresAt,
  };
};

module.exports = { issueOtp, generateAndSendOtp, deliverOtpEmail, getEmailDeliveryMessage };
