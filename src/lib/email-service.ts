import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface GuardianNotificationData {
  studentName: string;
  formTitle: string;
  formDescription: string;
  submissionDate: string;
  pdfBuffer: Buffer;
  guardianEmail: string;
}

export interface OTPEmailData {
  email: string;
  otpCode: string;
  userName: string;
}

export interface RegistrationOTPEmailData {
  email: string;
  otpCode: string;
  userName: string;
}

export interface LoginOTPEmailData {
  email: string;
  otpCode: string;
  userName: string;
}

export interface PasswordResetOTPEmailData {
  email: string;
  otpCode: string;
  userName: string;
}

export interface AdminInvitationData {
  email: string;
  invitationLink: string;
  invitedByName: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendGuardianNotification(data: GuardianNotificationData) {
  try {
    const { studentName, formTitle, formDescription, submissionDate, pdfBuffer, guardianEmail } = data;
    

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Form Submission Notification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #3b82f6;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #f8fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
            border: 1px solid #e2e8f0;
          }
          .info-box {
            background-color: white;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
          }
          .label {
            font-weight: bold;
            color: #374151;
            margin-bottom: 5px;
          }
          .value {
            color: #6b7280;
            margin-bottom: 15px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Form Submission Notification</h1>
          <p>Your student has submitted a form</p>
        </div>
        
        <div class="content">
          <p>Dear Guardian,</p>
          
          <p>We are writing to inform you that <strong>${studentName}</strong> has submitted a form through the student portal.</p>
          
          <div class="info-box">
            <div class="label">Student Name:</div>
            <div class="value">${studentName}</div>
            
            <div class="label">Form Title:</div>
            <div class="value">${formTitle}</div>
            
            <div class="label">Form Description:</div>
            <div class="value">${formDescription}</div>
            
            <div class="label">Submission Date:</div>
            <div class="value">${submissionDate}</div>
          </div>
          
          <p>The completed form document is attached to this email for your review. Please keep this document for your records.</p>
          
          <p>If you have any questions about this submission, please contact the school administration.</p>
          
          <p>Thank you for your attention.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from the Student Portal System</p>
          <p>Please do not reply to this email</p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Form Submission Notification

Dear Guardian,

We are writing to inform you that ${studentName} has submitted a form through the student portal.

Student Name: ${studentName}
Form Title: ${formTitle}
Form Description: ${formDescription}
Submission Date: ${submissionDate}

The completed form document is attached to this email for your review. Please keep this document for your records.

If you have any questions about this submission, please contact the school administration.

Thank you for your attention.

---
This is an automated notification from the Student Portal System
Please do not reply to this email
    `;

    const result = await resend.emails.send({
      from: 'Student Portal <noreply@plp-sso.site>',
      to: [guardianEmail],
      subject: `Form Submission Notification - ${formTitle}`,
      html: emailHtml,
      text: emailText,
      attachments: [
        {
          filename: `${formTitle.replace(/[^a-zA-Z0-9]/g, '_')}_submission.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (result.error) {
      console.error('📧 Email Error - Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Resend API error' };
    }
    
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendOTPEmail(data: OTPEmailData) {
  try {
    const { email, otpCode, userName } = data;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Change Verification</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #10b981;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 10px;
        }
        .otp-container {
          background-color: #f0fdf4;
          border: 2px solid #10b981;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          color: #10b981;
          letter-spacing: 5px;
          margin: 10px 0;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
        .button {
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Student Portal System</div>
          <h1>Password Change Verification</h1>
        </div>
        
        <p>Hello <strong>${userName}</strong>,</p>
        
        <p>You have requested to change your password. To complete this process, please use the following One-Time Password (OTP):</p>
        
        <div class="otp-container">
          <h3>Your Verification Code</h3>
          <div class="otp-code">${otpCode}</div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
        </div>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul>
            <li>This code is valid for 10 minutes only</li>
            <li>Do not share this code with anyone</li>
            <li>If you did not request this password change, please ignore this email</li>
            <li>Contact support immediately if you suspect unauthorized access</li>
          </ul>
        </div>
        
        <p>If you did not request this password change, please contact the system administrator immediately.</p>
        
        <div class="footer">
          <p>This is an automated message from the Student Portal System.</p>
          <p>Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Student Portal System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailText = `
Password Change Verification

Hello ${userName},

You have requested to change your password. To complete this process, please use the following One-Time Password (OTP):

Verification Code: ${otpCode}

This code will expire in 10 minutes.

Security Notice:
- This code is valid for 10 minutes only
- Do not share this code with anyone
- If you did not request this password change, please ignore this email
- Contact support immediately if you suspect unauthorized access

If you did not request this password change, please contact the system administrator immediately.

This is an automated message from the Student Portal System.
Please do not reply to this email.

© ${new Date().getFullYear()} Student Portal System. All rights reserved.
    `;

    const result = await resend.emails.send({
      from: 'Student Portal <noreply@plp-sso.site>',
      to: [email],
      subject: 'Password Change Verification - OTP Code',
      html: emailHtml,
      text: emailText,
    });

    if (result.error) {
      console.error('📧 OTP Email Error - Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Resend API error' };
    }
    
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendAdminInvitation(data: AdminInvitationData) {
  try {
    const { email, invitationLink, invitedByName } = data;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Invitation</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #10b981;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 10px;
        }
        .invitation-container {
          background-color: #f0fdf4;
          border: 2px solid #10b981;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          margin: 10px 0;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Student Portal System</div>
          <h1>Admin Invitation</h1>
        </div>
        
        <p>Hello,</p>
        
        <p><strong>${invitedByName}</strong> has invited you to become an administrator of the Student Portal System.</p>
        
        <div class="invitation-container">
          <h3>You're Invited to Join as Admin</h3>
          <p>Click the button below to complete your admin registration:</p>
          <a href="${invitationLink}" class="cta-button">Accept Invitation & Register</a>
          <p><strong>This invitation will expire in 24 hours.</strong></p>
        </div>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul>
            <li>This invitation is valid for 24 hours only</li>
            <li>Do not share this invitation link with anyone</li>
            <li>If you did not expect this invitation, please ignore this email</li>
            <li>Contact the system administrator if you have any concerns</li>
          </ul>
        </div>
        
        <p>Once you complete the registration, you will have administrative access to:</p>
        <ul>
          <li>Manage student accounts</li>
          <li>Create and manage forms</li>
          <li>View system analytics</li>
          <li>Access audit trails</li>
        </ul>
        
        <div class="footer">
          <p>This is an automated invitation from the Student Portal System.</p>
          <p>Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Student Portal System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailText = `
Admin Invitation - Student Portal System

Hello,

${invitedByName} has invited you to become an administrator of the Student Portal System.

You're Invited to Join as Admin

Click the link below to complete your admin registration:
${invitationLink}

This invitation will expire in 24 hours.

Security Notice:
- This invitation is valid for 24 hours only
- Do not share this invitation link with anyone
- If you did not expect this invitation, please ignore this email
- Contact the system administrator if you have any concerns

Once you complete the registration, you will have administrative access to:
- Manage student accounts
- Create and manage forms
- View system analytics
- Access audit trails

This is an automated invitation from the Student Portal System.
Please do not reply to this email.

© ${new Date().getFullYear()} Student Portal System. All rights reserved.
    `;

    const result = await resend.emails.send({
      from: 'Student Portal <noreply@plp-sso.site>',
      to: [email],
      subject: 'Admin Invitation - Student Portal System',
      html: emailHtml,
      text: emailText,
    });

    if (result.error) {
      console.error('📧 Admin Invitation Email Error - Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Resend API error' };
    }
    
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending admin invitation email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendRegistrationOTPEmail(data: RegistrationOTPEmailData) {
  try {
    const { email, otpCode, userName } = data;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Registration Verification</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #3b82f6;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 10px;
        }
        .otp-container {
          background-color: #eff6ff;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          color: #3b82f6;
          letter-spacing: 5px;
          margin: 10px 0;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Student Portal System</div>
          <h1>Registration Verification</h1>
        </div>
        
        <p>Hello <strong>${userName}</strong>,</p>
        
        <p>Welcome to the Student Portal System! To complete your registration, please use the following One-Time Password (OTP):</p>
        
        <div class="otp-container">
          <h3>Your Verification Code</h3>
          <div class="otp-code">${otpCode}</div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
        </div>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul>
            <li>This code is valid for 10 minutes only</li>
            <li>Do not share this code with anyone</li>
            <li>If you did not request this registration, please ignore this email</li>
            <li>Contact support immediately if you suspect unauthorized access</li>
          </ul>
        </div>
        
        <p>Once verified, you'll be able to access all student portal features including form submissions and notifications.</p>
        
        <div class="footer">
          <p>This is an automated message from the Student Portal System.</p>
          <p>Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Student Portal System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailText = `
Registration Verification - Student Portal System

Hello ${userName},

Welcome to the Student Portal System! To complete your registration, please use the following One-Time Password (OTP):

Verification Code: ${otpCode}

This code will expire in 10 minutes.

Security Notice:
- This code is valid for 10 minutes only
- Do not share this code with anyone
- If you did not request this registration, please ignore this email
- Contact support immediately if you suspect unauthorized access

Once verified, you'll be able to access all student portal features including form submissions and notifications.

This is an automated message from the Student Portal System.
Please do not reply to this email.

© ${new Date().getFullYear()} Student Portal System. All rights reserved.
    `;

    const result = await resend.emails.send({
      from: 'Student Portal <noreply@plp-sso.site>',
      to: [email],
      subject: 'Registration Verification - OTP Code',
      html: emailHtml,
      text: emailText,
    });

    if (result.error) {
      console.error('📧 Registration OTP Email Error - Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Resend API error' };
    }
    
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending registration OTP email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendLoginOTPEmail(data: LoginOTPEmailData): Promise<EmailResult> {
  try {
    const { email, otpCode, userName } = data;
    
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login Verification</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f4f4f4;
        }
        .container {
          background-color: #ffffff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #10b981;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 10px;
        }
        .otp-container {
          background-color: #f0fdf4;
          border: 2px solid #10b981;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          color: #10b981;
          letter-spacing: 5px;
          margin: 10px 0;
          font-family: 'Courier New', monospace;
        }
        .warning {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Student Portal System</div>
          <h1>Login Verification</h1>
        </div>
        
        <p>Hello <strong>${userName}</strong>,</p>
        
        <p>You have requested to log in to your account. To complete the login process, please use the following One-Time Password (OTP):</p>
        
        <div class="otp-container">
          <h3>Your Verification Code</h3>
          <div class="otp-code">${otpCode}</div>
          <p><strong>This code will expire in 10 minutes.</strong></p>
        </div>
        
        <div class="warning">
          <strong>⚠️ Security Notice:</strong>
          <ul>
            <li>This code is valid for 10 minutes only</li>
            <li>Do not share this code with anyone</li>
            <li>If you did not request this login, please ignore this email</li>
            <li>Contact support immediately if you suspect unauthorized access</li>
          </ul>
        </div>
        
        <p>If you did not request this login, please contact the system administrator immediately.</p>
        
        <div class="footer">
          <p>This is an automated message from the Student Portal System.</p>
          <p>Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Student Portal System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const emailText = `
Login Verification - Student Portal System

Hello ${userName},

You have requested to log in to your account. To complete the login process, please use the following One-Time Password (OTP):

Verification Code: ${otpCode}

This code will expire in 10 minutes.

Security Notice:
- This code is valid for 10 minutes only
- Do not share this code with anyone
- If you did not request this login, please ignore this email
- Contact support immediately if you suspect unauthorized access

If you did not request this login, please contact the system administrator immediately.

This is an automated message from the Student Portal System.
Please do not reply to this email.

© ${new Date().getFullYear()} Student Portal System. All rights reserved.
    `;

    const result = await resend.emails.send({
      from: 'Student Portal <noreply@plp-sso.site>',
      to: [email],
      subject: 'Login Verification - OTP Code',
      html: emailHtml,
      text: emailText,
    });

    if (result.error) {
      console.error('📧 Login OTP Email Error - Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Resend API error' };
    }
    
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending login OTP email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendPasswordResetOTPEmail(data: PasswordResetOTPEmailData): Promise<EmailResult> {
  try {
    const { email, otpCode, userName } = data;

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Verification</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #10b981;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #10b981;
                margin-bottom: 10px;
            }
            .title {
                color: #1f2937;
                font-size: 28px;
                margin: 0;
            }
            .otp-container {
                background-color: #f0fdf4;
                border: 2px solid #10b981;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                margin: 30px 0;
            }
            .otp-code {
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
            }
            .warning {
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .warning-title {
                color: #92400e;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .warning-list {
                color: #92400e;
                margin: 0;
                padding-left: 20px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Student Portal</div>
                <h1 class="title">Password Reset Verification</h1>
            </div>
            
            <p>Hello <strong>${userName}</strong>,</p>
            
            <p>You have requested to reset your password. To complete the password reset process, please use the following One-Time Password (OTP):</p>
            
            <div class="otp-container">
                <h2 style="margin: 0 0 20px 0;">Your Password Reset Code</h2>
                <div class="otp-code">${otpCode}</div>
                <p style="margin: 0; font-size: 16px;">This code will expire in 10 minutes</p>
            </div>
            
            <div class="warning">
                <div class="warning-title">🔒 Security Notice</div>
                <ul class="warning-list">
                    <li>This code is valid for 10 minutes only</li>
                    <li>Do not share this code with anyone</li>
                    <li>If you did not request this password reset, please ignore this email</li>
                    <li>Contact support immediately if you suspect unauthorized access</li>
                </ul>
            </div>
            
            <p>If you did not request this password reset, please contact the system administrator immediately.</p>
            
            <div class="footer">
                <p>This is an automated message from the Student Portal System.</p>
                <p>Please do not reply to this email.</p>
                <p>© ${new Date().getFullYear()} Student Portal System. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const emailText = `
Password Reset Verification - Student Portal System

Hello ${userName},

You have requested to reset your password. To complete the password reset process, please use the following One-Time Password (OTP):

Verification Code: ${otpCode}

This code will expire in 10 minutes.

Security Notice:
- This code is valid for 10 minutes only
- Do not share this code with anyone
- If you did not request this password reset, please ignore this email
- Contact support immediately if you suspect unauthorized access

If you did not request this password reset, please contact the system administrator immediately.

This is an automated message from the Student Portal System.
Please do not reply to this email.

© ${new Date().getFullYear()} Student Portal System. All rights reserved.
    `;

    const result = await resend.emails.send({
      from: 'Student Portal <noreply@plp-sso.site>',
      to: [email],
      subject: 'Password Reset Verification - OTP Code',
      html: emailHtml,
      text: emailText,
    });

    if (result.error) {
      console.error('📧 Password Reset OTP Email Error - Resend API error:', result.error);
      return { success: false, error: result.error.message || 'Resend API error' };
    }
    
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
