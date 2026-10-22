const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const firstConfiguredValue = (...values) => values
  .find((value) => typeof value === 'string' && value.trim())
  ?.trim() || '';

const smtpUser = firstConfiguredValue(process.env.EMAIL_USER, process.env.SMTP_USER, process.env.GMAIL_USER);
const smtpPassword = firstConfiguredValue(
  process.env.EMAIL_APP_PASSWORD,
  process.env.EMAIL_PASS,
  process.env.SMTP_PASS
).replace(/\s+/g, '');
const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 465);
const secureSetting = firstConfiguredValue(process.env.SMTP_SECURE, process.env.EMAIL_SECURE);
const smtpSecure = !secureSetting
  ? smtpPort === 465
  : /^(true|1|yes)$/i.test(secureSetting.trim());
const isPlaceholder = (value) => /your[-_ ]|placeholder|example\.com|change[_ -]?this|enter.*(email|password)/i.test(value);
const smtpCredentialsConfigured = Boolean(smtpUser && smtpPassword);

if (![465, 587].includes(smtpPort)) {
  throw new Error(`Invalid Gmail SMTP port "${smtpPort}". Use port 465 or 587.`);
}

console.log('[OTP EMAIL CONFIG]', {
  senderConfigured: Boolean(smtpUser) && !isPlaceholder(smtpUser),
  passwordConfigured: Boolean(smtpPassword) && !isPlaceholder(smtpPassword),
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
});

if (!smtpCredentialsConfigured) {
  console.warn(
    '[OTP EMAIL CONFIG] Gmail credentials are missing. Add EMAIL_USER and EMAIL_APP_PASSWORD in backend/.env. OTP generation will continue without email.'
  );
} else if (isPlaceholder(smtpUser) || isPlaceholder(smtpPassword)) {
  console.warn(
    '[OTP EMAIL CONFIG] Gmail credentials still contain placeholders. Replace them with the real sender address and Google App Password.'
  );
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  connectionTimeout: 4000,
  greetingTimeout: 4000,
  socketTimeout: 4000,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 5,
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
});

const sendMail = async (mailOptions) => {
  if (!smtpCredentialsConfigured) {
    const error = new Error('Gmail SMTP credentials are not configured.');
    error.code = 'SMTP_CONFIG_MISSING';
    throw error;
  }

  await transporter.verify();
  return transporter.sendMail(mailOptions);
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendJobRejectionEmail = async ({ toEmail, jobTitle, reason }) => {
  const cleanTo = String(toEmail || '').trim().toLowerCase();
  const senderEmail = smtpUser;
  if (!cleanTo) throw new Error('Employer email is missing.');

  const safeJobTitle = escapeHtml(jobTitle || 'Job listing');
  const safeReason = escapeHtml(reason || 'Please review the job listing and contact support if you need clarification.');
  const dashboardUrl = `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/employer/dashboard?view=jobs`;
  return sendMail({
    from: `"SmartRecruit AI" <${senderEmail}>`,
    to: cleanTo,
    subject: `Job listing rejected: ${jobTitle || 'Job listing'}`,
    text: `Your job listing "${jobTitle || 'Job listing'}" was rejected.\n\nReason: ${reason}\n\nReview your job listings: ${dashboardUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a"><h2>Your job listing needs changes</h2><p>The job listing <strong>${safeJobTitle}</strong> was rejected by the admin team.</p><h3>Reason</h3><p>${safeReason}</p><p><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#2b73a4;color:#fff;text-decoration:none">Review job listing</a></p><p style="color:#64748b;font-size:13px">SmartRecruit AI</p></div>`,
  });
};

const sendEmailOtp = async (toEmail, otpCode, recipientName = 'User') => {
  const cleanTo = String(toEmail || '').trim().toLowerCase();
  const senderEmail = smtpUser;
  const senderName = 'SmartRecruit AI';

  if (!cleanTo) {
    throw new Error('OTP recipient email is required.');
  }
  if (!/^\d{6}$/.test(String(otpCode))) {
    throw new Error('OTP email code must contain exactly 6 digits.');
  }

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: cleanTo,
    subject: `${otpCode} is your SmartRecruit AI verification code`,
    priority: 'high',
    text: `Your SmartRecruit AI verification code is: ${otpCode}. Valid for 1 minute.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">SmartRecruit AI Verification</h2>
        <p style="color: #475569; font-size: 15px;">Use the verification code below to sign in to your account:</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb;">${escapeHtml(otpCode)}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code will expire in 1 minute. If you did not request this, please ignore this email.</p>
      </div>
    `,
    headers: {
      'X-Priority': '1 (Highest)',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'X-Mailer': 'SmartRecruit Transactional Mailer',
    },
  };

  console.log(`📡 [DISPATCHING GMAIL] Sending verification email to ${cleanTo}...`);
  try {
    const info = await sendMail(mailOptions);
    console.log(`✅ [EMAIL SENT SUCCESS] Message ID: ${info.messageId} to ${cleanTo}`);
    return info;
  } catch (error) {
    console.error('SMTP Error:', error.message);
    throw error;
  }
};

module.exports = { sendEmailOtp, sendJobRejectionEmail };
