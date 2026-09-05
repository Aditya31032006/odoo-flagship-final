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
    console.warn("⚠️ SMTP configuration missing in .env. Skipping real mail dispatch.");
    return { skipped: true, toEmail, subject };
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
    from: `"DealFlow360" <${from}>`,
    to: toEmail,
    subject,
    html,
    text: text || undefined,
  });

  return info;
}

/**
 * Generates an HTML welcome email for newly registered users on DealFlow360.
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
    <title>Welcome to DealFlow360</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #e2e8f0;
      }
      .email-container {
        max-width: 600px;
        margin: 30px auto;
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      }
      .email-header {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        padding: 32px 24px;
        text-align: center;
        color: #ffffff;
      }
      .email-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      .email-body {
        padding: 32px 28px;
        line-height: 1.6;
        color: #cbd5e1;
      }
      .welcome-title {
        font-size: 19px;
        font-weight: 600;
        color: #f8fafc;
        margin-top: 0;
      }
      .user-card {
        background-color: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 16px 20px;
        margin: 20px 0;
      }
      .user-card p {
        margin: 6px 0;
        font-size: 14px;
      }
      .user-card strong {
        color: #93c5fd;
      }
      .features-list {
        padding-left: 20px;
        margin: 16px 0;
        color: #94a3b8;
      }
      .features-list li {
        margin-bottom: 8px;
      }
      .footer {
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        background-color: #0f172a;
        border-top: 1px solid #334155;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>🌐 Welcome to DealFlow360</h1>
      </div>
      <div class="email-body">
        <h2 class="welcome-title">Hello ${name || 'Sales Partner'},</h2>
        <p>Welcome to <strong>DealFlow360</strong> — your end-to-end B2B sales operations, deal governance, and fulfillment platform.</p>
        
        <div class="user-card">
          <p><strong>Account Name:</strong> ${name}</p>
          <p><strong>Registered Email:</strong> ${email}</p>
        </div>

        <p>Your workspace is now ready. Key capabilities at your fingertips:</p>
        <ul class="features-list">
          <li><strong>Quotation Management & Governance:</strong> Multi-variant SKU pricing with discount ceiling evaluation.</li>
          <li><strong>Tier-Based Approvals:</strong> Automated risk scoring and manager discount review.</li>
          <li><strong>Warehouse Fulfillment:</strong> Multi-split shipments and backorder allocation.</li>
          <li><strong>KUBER Invoicing:</strong> Direct sales-to-ledger accounting linkage.</li>
        </ul>

        <p>If you have any questions or need onboarding assistance, please reach out to your system administrator.</p>
        
        <p style="margin-top: 24px; color: #f8fafc;">Best regards,<br><strong>The DealFlow360 Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} DealFlow360 Sales Operations. All rights reserved.
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
    <title>DealFlow360 Password Reset OTP</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #e2e8f0;
      }
      .email-container {
        max-width: 550px;
        margin: 30px auto;
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      }
      .email-header {
        background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
        padding: 28px 24px;
        text-align: center;
        color: #ffffff;
      }
      .email-header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
      }
      .email-body {
        padding: 30px 28px;
        line-height: 1.6;
        color: #cbd5e1;
      }
      .otp-box {
        font-size: 34px;
        font-weight: 800;
        letter-spacing: 10px;
        color: #38bdf8;
        text-align: center;
        background-color: #0f172a;
        border: 2px dashed #38bdf8;
        border-radius: 10px;
        padding: 16px;
        margin: 22px 0;
      }
      .note {
        font-size: 13px;
        color: #94a3b8;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        padding: 10px 14px;
        border-radius: 6px;
      }
      .footer {
        padding: 18px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        background-color: #0f172a;
        border-top: 1px solid #334155;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>🔒 DealFlow360 Security Verification</h1>
      </div>
      <div class="email-body">
        <p style="font-size: 15px; color: #f8fafc;">Hello,</p>
        <p>We received a request to reset your password for your <strong>DealFlow360</strong> account. Use the one-time verification code below:</p>
        
        <div class="otp-box">${otp}</div>

        <div class="note">
          ⚠️ This code expires in <strong>5 minutes</strong>. If you did not request this password reset, please ignore this email or contact your administrator.
        </div>
        
        <p style="margin-top: 24px; color: #f8fafc;">Stay secure,<br><strong>The DealFlow360 Security Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} DealFlow360 Security. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Generates an HTML staff invitation email with generated credentials
 */
export function generateStaffInvitationEmail({ name, email, role, tempPassword }) {
  const roleNames = {
    sales_rep: 'Sales Representative',
    sales_manager: 'Sales Manager',
    finance: 'Finance Controller',
    operations: 'Operations Lead',
    admin: 'System Administrator',
  };
  const displayRole = roleNames[role] || role;
  const loginUrl = config.FRONTEND_ORIGIN ? `${config.FRONTEND_ORIGIN}/login` : 'http://localhost:5173/login';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You've Been Invited to DealFlow360</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0b0f19;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #f1f5f9;
      }
      .email-container {
        max-width: 580px;
        margin: 40px auto;
        background-color: #1e293b;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #334155;
      }
      .email-header {
        background: linear-gradient(135deg, #2563eb 0%, #38bdf8 100%);
        padding: 30px 20px;
        text-align: center;
        color: #ffffff;
      }
      .email-header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      }
      .email-body {
        padding: 30px 28px;
        line-height: 1.6;
        color: #cbd5e1;
      }
      .credentials-box {
        background-color: #0f172a;
        border: 1px solid rgba(56, 189, 248, 0.3);
        border-radius: 10px;
        padding: 18px 20px;
        margin: 20px 0;
      }
      .cred-row {
        margin: 8px 0;
        font-size: 14px;
      }
      .cred-label {
        color: #94a3b8;
        display: inline-block;
        width: 110px;
      }
      .cred-value {
        color: #ffffff;
        font-weight: 600;
        font-family: monospace;
      }
      .cred-highlight {
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.1);
        padding: 3px 8px;
        border-radius: 4px;
      }
      .btn {
        display: inline-block;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff !important;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        margin-top: 15px;
      }
      .footer {
        padding: 18px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        background-color: #0f172a;
        border-top: 1px solid #334155;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>👋 Welcome to the Team!</h1>
      </div>
      <div class="email-body">
        <p style="font-size: 16px; color: #f8fafc;">Hello <strong>${name}</strong>,</p>
        <p>An administrator has invited you to join <strong>DealFlow360</strong> as a <strong>${displayRole}</strong>.</p>
        
        <p>Here are your temporary login credentials:</p>
        <div class="credentials-box">
          <div class="cred-row"><span class="cred-label">Role:</span> <span class="cred-value" style="color: #38bdf8;">${displayRole}</span></div>
          <div class="cred-row"><span class="cred-label">Login Email:</span> <span class="cred-value">${email}</span></div>
          <div class="cred-row"><span class="cred-label">Password:</span> <span class="cred-value cred-highlight">${tempPassword}</span></div>
        </div>

        <p style="font-size: 13px; color: #94a3b8;">For security, we recommend changing your password from your Profile settings immediately after your first sign-in.</p>

        <div style="text-align: center; margin: 25px 0 15px 0;">
          <a href="${loginUrl}" class="btn">Sign In to DealFlow360 &rarr;</a>
        </div>

/**
 * Generates an HTML email sent to customer when quotation is Approved with Negotiate and Confirm buttons
 */
export function generateQuotationApprovedEmail({
  customerName,
  quotationNumber,
  quotationId,
  grandTotal,
  validUntil,
  items = [],
  frontendUrl,
}) {
  const baseFrontend = frontendUrl || config.FRONTEND_ORIGIN || 'http://localhost:5173';
  const negotiateUrl = `${baseFrontend}/my_quotations?quoteId=${quotationId}`;
  const confirmUrl = `${baseFrontend}/my_quotations?action=confirm&quoteId=${quotationId}`;
  const formattedTotal = `$${Number(grandTotal || 0).toLocaleString()}`;
  const formattedValid = validUntil ? new Date(validUntil).toLocaleDateString() : '30 Days from issue';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation Approved: ${quotationNumber}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0b0f19;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #f1f5f9;
      }
      .email-container {
        max-width: 600px;
        margin: 35px auto;
        background-color: #1e293b;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #334155;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      }
      .email-header {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        padding: 28px 24px;
        text-align: center;
        color: #ffffff;
      }
      .email-header h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }
      .email-body {
        padding: 30px 28px;
        line-height: 1.6;
        color: #cbd5e1;
      }
      .quote-summary-card {
        background-color: #0f172a;
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 10px;
        padding: 20px;
        margin: 22px 0;
      }
      .quote-row {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
        font-size: 14px;
      }
      .quote-label {
        color: #94a3b8;
      }
      .quote-val {
        color: #ffffff;
        font-weight: 600;
      }
      .grand-total {
        font-size: 20px;
        font-weight: 800;
        color: #34d399;
      }
      .actions-container {
        margin: 30px 0 15px 0;
        text-align: center;
      }
      .btn {
        display: inline-block;
        padding: 13px 24px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 14px;
        text-decoration: none;
        margin: 8px 6px;
        transition: all 0.2s ease;
      }
      .btn-confirm {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        color: #ffffff !important;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      }
      .btn-negotiate {
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid #38bdf8;
        color: #38bdf8 !important;
      }
      .footer {
        padding: 20px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        background-color: #0f172a;
        border-top: 1px solid #334155;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>✅ Quotation Approved & Ready</h1>
      </div>
      <div class="email-body">
        <p style="font-size: 16px; color: #f8fafc;">Dear <strong>${customerName || 'Valued Partner'}</strong>,</p>
        <p>Your quotation <strong>${quotationNumber}</strong> has been <strong>approved</strong> by our sales and finance team and is ready for your review.</p>
        
        <div class="quote-summary-card">
          <div class="quote-row">
            <span class="quote-label">Quotation Number:</span>
            <span class="quote-val" style="color: #38bdf8;">${quotationNumber}</span>
          </div>
          <div class="quote-row">
            <span class="quote-label">Valid Until:</span>
            <span class="quote-val">${formattedValid}</span>
          </div>
          <hr style="border: 0; border-top: 1px solid #334155; margin: 12px 0;" />
          <div class="quote-row">
            <span class="quote-label" style="font-size: 16px; font-weight: bold; color: #f8fafc;">Grand Total:</span>
            <span class="quote-val grand-total">${formattedTotal}</span>
          </div>
        </div>

        <p style="text-align: center; font-weight: 600; color: #f8fafc; margin-top: 24px;">Please choose how you would like to proceed:</p>

        <div class="actions-container">
          <a href="${confirmUrl}" class="btn btn-confirm">
            ✅ Direct Confirm Order
          </a>
          <a href="${negotiateUrl}" class="btn btn-negotiate">
            💬 Negotiate / Request Changes
          </a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 20px;">
          Clicking <strong>Direct Confirm</strong> will immediately lock this quotation and create the fulfillment order in the system.
        </p>

        <p style="margin-top: 28px; color: #f8fafc;">Best regards,<br><strong>The DealFlow360 Sales Team</strong></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} DealFlow360 B2B Sales Operations. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}