const twilio = require('twilio');
const { sendEmailOtp } = require('./notificationService');

const smsClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

console.log('[OTP SMS CONFIGURED]:', Boolean(smsClient && process.env.TWILIO_PHONE_NUMBER));

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendOtpSms = async (phone, otpCode) => {
  if (!phone) return false;
  if (!smsClient || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('Twilio credentials are not configured; SMS was not sent.');
    return false;
  }

  await smsClient.messages.create({
    body: `Your Job Matching AI verification code is ${otpCode}. It expires in 3 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
  return true;
};

const issueOtp = async ({ dbClient, email, phone, purpose = 'registration' }) => {
  const cleanEmail = email.trim().toLowerCase();
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const client = dbClient;

  await client.execute('UPDATE otps SET is_used = TRUE WHERE email = ? AND is_used = FALSE', [cleanEmail]);
  await client.execute(
    `INSERT INTO otps (email, otp_code, purpose, expires_at, is_used)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 MINUTE), FALSE)`,
    [cleanEmail, otpCode, purpose]
  );

  console.log('[OTP CODE]:', otpCode);
  const delivery = { email: false, sms: false };
  await sendEmailOtp(cleanEmail, otpCode);
  delivery.email = true;
  try {
    delivery.sms = await sendOtpSms(phone, otpCode);
  } catch (error) {
    console.error('OTP SMS delivery failed:', error.message);
  }

  return { otpCode, delivery };
};

const generateAndSendOtp = async ({ email, phone, purpose = 'registration', dbClient, recipientName }) => {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Email is required to generate OTP.');
  }

  const client = dbClient || require('../connection');
  const result = await issueOtp({ dbClient: client, email: cleanEmail, phone, purpose });

  return {
    success: true,
    email: cleanEmail,
    purpose,
    recipientName,
    otpCode: result.otpCode,
    delivery: result.delivery,
  };
};

module.exports = { issueOtp, generateAndSendOtp };
