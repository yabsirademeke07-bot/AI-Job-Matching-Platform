const nodemailer = require('nodemailer');

const sendOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // የእርስዎ Gmail
      pass: process.env.EMAIL_PASS, // የ Gmail App Password
    },
  });

  const mailOptions = {
    from: `"SmartRecruit AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Verification Code (OTP)',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Welcome to SmartRecruit AI</h2>
        <p>Your OTP verification code is:</p>
        <h1 style="color: #56a2d8; letter-spacing: 4px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendOtpEmail;