import nodemailer from 'nodemailer';
import config from '../config/config.js';

/**
 * Sends an email using the configured SMTP server.
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.html - HTML body content
 * @param {string} [params.text] - Optional plain text alternative
 */
export async function sendMail({ toEmail, subject, html, text }) {
  const host = config.SMTP_HOST;
  const port = Number(config.SMTP_PORT);
  const secure = String(config.SMTP_SECURE) === 'true';
  const user = config.SMTP_USER;
  const pass = config.SMTP_PASS;
  const from = config.MAIL_FROM;

  if (!host || !user || !pass || !from) {
    const err = new Error("SMTP configuration missing. Set SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM in your .env.");
    err.status = 500;
    throw err;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"GlobeTrotter" <${from}>`,
    to: toEmail,
    subject,
    html,
    text: text || undefined,
  });

  return info;
}

/**
 * Generates an HTML welcome email for newly registered users.
 * @param {Object} params
 * @param {string} params.name - User's full name
 * @param {string} params.email - User's email address
 */
export function generateWelcomeEmail({ name, email }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to GlobeTrotter</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f7fa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #333333;
      }
      .email-container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }
      .email-header {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        padding: 36px 24px;
        text-align: center;
        color: #ffffff;
      }
      .email-header h1 {
        margin: 0;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .email-body {
        padding: 32px 28px;
        line-height: 1.6;
      }
      .welcome-title {
        font-size: 20px;
        font-weight: 600;
        color: #1e293b;
        margin-top: 0;
      }
      .user-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px 20px;
        margin: 24px 0;
      }
      .user-card p {
        margin: 6px 0;
        font-size: 14px;
      }
      .user-card strong {
        color: #475569;
      }
      .footer {
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #94a3b8;
        background-color: #f8fafc;
        border-top: 1px solid #edf2f7;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>🌍 Welcome to GlobeTrotter</h1>
      </div>
      <div class="email-body">
        <h2 class="welcome-title">Hello ${name || 'Explorer'},</h2>
        <p>Thank you for signing up with <strong>GlobeTrotter</strong>! We're thrilled to have you join our community.</p>
        
        <div class="user-card">
          <p><strong>Registered Name:</strong> ${name}</p>
          <p><strong>Account Email:</strong> ${email}</p>
        </div>

        <p>Your account is now ready. Start discovering destinations, planning trips, and connecting with fellow travelers!</p>
        <p>If you have any questions or need assistance, feel free to reply to this email.</p>
        
        <p style="margin-top: 28px;">Happy travels,<br><strong>The GlobeTrotter Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} GlobeTrotter. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Generates an HTML email for password reset OTP.
 * @param {Object} params
 * @param {string} params.otp - 6-digit OTP code
 */
export function generateOtpEmail({ otp }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f7fa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #333333;
      }
      .email-container {
        max-width: 550px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }
      .email-header {
        background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
        padding: 30px 24px;
        text-align: center;
        color: #ffffff;
      }
      .email-header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
      }
      .email-body {
        padding: 32px 28px;
        line-height: 1.6;
      }
      .otp-box {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: 8px;
        color: #b91c1c;
        text-align: center;
        background-color: #fef2f2;
        border: 2px dashed #fca5a5;
        border-radius: 10px;
        padding: 16px;
        margin: 24px 0;
      }
      .note {
        font-size: 13px;
        color: #64748b;
      }
      .footer {
        padding: 18px;
        text-align: center;
        font-size: 12px;
        color: #94a3b8;
        background-color: #f8fafc;
        border-top: 1px solid #edf2f7;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>🔒 Password Reset Request</h1>
      </div>
      <div class="email-body">
        <p>Hello,</p>
        <p>We received a request to reset your GlobeTrotter password. Use the verification OTP below to complete the process:</p>
        
        <div class="otp-box">${otp}</div>

        <p class="note">⚠️ This OTP is valid for <strong>5 minutes</strong>. If you did not request this, please ignore this email and your password will remain unchanged.</p>
        
        <p style="margin-top: 24px;">Stay secure,<br><strong>The GlobeTrotter Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} GlobeTrotter. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}