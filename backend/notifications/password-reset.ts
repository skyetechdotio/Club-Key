import { User } from '@shared/schema';
import { sendEmail } from './email';

/**
 * Send a password reset email with a reset token
 */
export async function sendPasswordResetEmail(user: User, resetToken: string): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send password reset email: User has no email address');
    return false;
  }
  
  const subject = `Reset Your Linx Password`;
  
  // Make sure we have a name to use
  const firstName = user.firstName || user.username || 'Golfer';
  
  // Generate the reset URL with the token
  const resetUrl = `${process.env.APP_URL || 'https://linxgolfapp.com'}/reset-password?token=${resetToken}`;
  
  const text = `
    Hello ${firstName},

    You recently requested to reset your password for your Linx account. Click the link below to reset it:
    
    ${resetUrl}
    
    This password reset link is only valid for 1 hour. If you did not request a password reset, please ignore this email or contact support if you have questions.
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>Reset Your Password</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>You recently requested to reset your password for your Linx account. Click the button below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Your Password
          </a>
        </div>
        
        <p style="font-size: 13px; color: #777;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 13px; color: #777; word-break: break-all;"><a href="${resetUrl}" style="color: #205A50;">${resetUrl}</a></p>
        
        <p><strong>This password reset link is only valid for 1 hour.</strong></p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>© 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
}

/**
 * Send a password reset success confirmation email
 */
export async function sendPasswordResetSuccessEmail(user: User): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send password reset success email: User has no email address');
    return false;
  }
  
  const subject = `Your Linx Password Has Been Reset`;
  
  // Make sure we have a name to use
  const firstName = user.firstName || user.username || 'Golfer';
  
  const text = `
    Hello ${firstName},

    Your password for your Linx account has been successfully reset.
    
    If you did not make this change or if you believe an unauthorized person has accessed your account, please contact us immediately.
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #49DCB1; padding: 20px; text-align: center; color: white;">
        <h1>Password Reset Successful</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Your password for your Linx account has been successfully reset.</p>
        
        <p>If you did not make this change or if you believe an unauthorized person has accessed your account, please contact us immediately.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.APP_URL || 'https://linxgolfapp.com'}/login" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Sign In to Your Account
          </a>
        </div>
        
        <p>The Linx Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>© 2025 Linx Golf. All rights reserved.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: user.email,
    subject,
    text,
    html,
  });
}