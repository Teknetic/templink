import nodemailer from 'nodemailer';

// Email configuration
// For development: Uses Ethereal (fake SMTP - emails won't actually send but you can preview them)
// For production: Set these in your .env file with real SMTP credentials

let transporter;

const initEmailService = async () => {
  if (process.env.SMTP_HOST) {
    // Production: Use configured SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('✅ Email service configured with SMTP');
  } else {
    // Development: Use Ethereal test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('✅ Email service configured (Test Mode - emails won\'t actually send)');
      console.log('📧 Preview emails at: https://ethereal.email');
    } catch (error) {
      console.warn('⚠️  Email service not configured. Email features will be disabled.');
    }
  }
};

// Initialize on module load
await initEmailService();

// Send email function
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.warn('Email service not available');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"TempLink" <noreply@templink.com>',
      to,
      subject,
      text,
      html
    });

    // For development (Ethereal), log the preview URL
    if (!process.env.SMTP_HOST) {
      console.log('📧 Preview email:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Email templates

export const sendVerificationEmail = async (email, name, verificationToken) => {
  const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔗 Welcome to TempLink!</h1>
        </div>
        <div class="content">
          <p>Hi ${name || 'there'},</p>
          <p>Thanks for signing up! Please verify your email address to activate your account.</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>TempLink - Smart Link Shortener</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify your TempLink account',
    html,
    text: `Hi ${name || 'there'},\n\nPlease verify your email by clicking this link: ${verificationUrl}\n\nThis link expires in 24 hours.`
  });
};

export const sendPasswordResetEmail = async (email, name, resetToken) => {
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${name || 'there'},</p>
          <p>We received a request to reset your password for your TempLink account.</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <p style="margin: 5px 0 0 0;">This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
        </div>
        <div class="footer">
          <p>TempLink - Smart Link Shortener</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset your TempLink password',
    html,
    text: `Hi ${name || 'there'},\n\nReset your password by clicking this link: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`
  });
};

export const sendWelcomeEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to TempLink!</h1>
        </div>
        <div class="content">
          <p>Hi ${name || 'there'},</p>
          <p>Your account is now active! Here's what you can do:</p>

          <div class="feature">
            <strong>⏰ Time-based Expiration</strong>
            <p style="margin: 5px 0 0 0;">Set links to expire after custom duration</p>
          </div>

          <div class="feature">
            <strong>👁️ View Limits</strong>
            <p style="margin: 5px 0 0 0;">Limit how many times links can be accessed</p>
          </div>

          <div class="feature">
            <strong>🔒 Password Protection</strong>
            <p style="margin: 5px 0 0 0;">Secure sensitive links with passwords</p>
          </div>

          <div class="feature">
            <strong>📊 Analytics</strong>
            <p style="margin: 5px 0 0 0;">Track clicks and visitor data</p>
          </div>

          <p style="text-align: center;">
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}" class="button">Start Creating Links</a>
          </p>

          <p><strong>Your Plan:</strong> Free (10 links per day)</p>
          <p><strong>Need more?</strong> Upgrade to Pro for unlimited links!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to TempLink! 🎉',
    html,
    text: `Hi ${name || 'there'},\n\nWelcome to TempLink! Your account is active.\n\nStart creating smart links at: ${process.env.BASE_URL || 'http://localhost:3000'}`
  });
};
