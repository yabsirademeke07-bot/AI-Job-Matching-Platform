const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const smtpPassword = process.env.EMAIL_APP_PASSWORD
  ? process.env.EMAIL_APP_PASSWORD.replace(/\s+/g, '')
  : '';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: smtpPassword,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ [GMAIL SMTP AUTH FAILED]:', error.message);
  } else {
    console.log('✅ [GMAIL SMTP AUTH SUCCESS]: Ready to dispatch emails to users.');
  }
});

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendEmailOtp = async (toEmail, otpCode, recipientName = 'User') => {
  const cleanTo = toEmail.trim().toLowerCase();

  if (!process.env.EMAIL_USER || !smtpPassword) {
    throw new Error('Gmail SMTP credentials are not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD.');
  }

  const mailOptions = {
    from: `"Job Matching Platform" <${process.env.EMAIL_USER}>`,
    to: cleanTo,
    subject: `Your Verification Code: ${otpCode} - Job Matching Platform`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #2563eb; text-align: center;">AI Job Matching Platform</h2>
        <p>Hello <strong>${escapeHtml(recipientName)}</strong>,</p>
        <p>Your 6-digit verification code is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; background: #eff6ff; border: 2px dashed #2563eb; border-radius: 8px; color: #1e40af; display: inline-block;">
            ${escapeHtml(otpCode)}
          </span>
        </div>
        <p style="font-size: 12px; color: #64748b;">⏱️ Valid for 3 minutes (ይህ ኮድ ለ 3 ደቂቃዎች ብቻ ያገለግላል)</p>
      </div>
    `,
  };

  console.log(`📡 [DISPATCHING GMAIL] Sending OTP ${otpCode} to ${cleanTo}...`);
  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ [GMAIL SENT SUCCESS] Message ID: ${info.messageId} to ${cleanTo}`);
  return info;
};

module.exports = { sendEmailOtp };
