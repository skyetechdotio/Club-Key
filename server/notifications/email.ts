import { User } from '@shared/schema';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not found, email notifications will not be sent');
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email notification
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not found, email notification not sent');
    return false;
  }

  try {
    await sgMail.send({
      to: params.to,
      from: 'noreply@linxgolfapp.com',
      subject: params.subject,
      text: params.text || '', // Provide fallback empty string
      html: params.html || '', // Provide fallback empty string
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Send a booking confirmation email to a guest
 */
export async function sendBookingConfirmation(user: User, bookingId: number, teeTimeListing: any): Promise<boolean> {
  const subject = 'Your Tee Time Booking is Confirmed';
  
  const date = new Date(teeTimeListing.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const text = `
    Hello ${user.firstName},

    Your tee time booking at ${teeTimeListing.club} has been confirmed!

    Booking details:
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing.numberOfPlayers}
    - Total Price: $${teeTimeListing.price.toFixed(2)}

    You can view your booking details and communicate with the host by visiting your account dashboard.

    Thank you for using Linx!
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>Booking Confirmation</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${user.firstName},</p>
        
        <p>Your tee time booking at <strong>${teeTimeListing.club}</strong> has been confirmed!</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing.numberOfPlayers}</p>
          <p><strong>Total Price:</strong> $${teeTimeListing.price.toFixed(2)}</p>
        </div>
        
        <p>You can view your booking details and communicate with the host by visiting your account dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/bookings/${bookingId}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>Thank you for using Linx!</p>
        
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
 * Send a booking status update email to a guest
 */
export async function sendBookingStatusUpdate(user: User, bookingId: number, status: string, teeTimeListing: any): Promise<boolean> {
  // Capitalize first letter of status
  const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);
  
  const subject = `Your Tee Time Booking Has Been ${statusDisplay}`;
  
  const date = new Date(teeTimeListing.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Status-specific messaging
  let statusMessage = '';
  let statusColor = '#205A50';
  
  if (status === 'completed') {
    statusMessage = 'Thank you for playing! We hope you enjoyed your tee time.';
    statusColor = '#49DCB1';
  } else if (status === 'cancelled') {
    statusMessage = 'We\'re sorry to hear that. Please contact support if you have any questions.';
    statusColor = '#FF4D4F';
  } else if (status === 'confirmed') {
    statusMessage = 'Your booking has been confirmed. We look forward to seeing you!';
    statusColor = '#52C41A';
  }

  const text = `
    Hello ${user.firstName},

    Your tee time booking at ${teeTimeListing.club} has been ${status}!
    
    ${statusMessage}

    Booking details:
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing.numberOfPlayers}
    - Total Price: $${teeTimeListing.price.toFixed(2)}

    You can view your booking details by visiting your account dashboard.

    Thank you for using Linx!
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${statusColor}; padding: 20px; text-align: center; color: white;">
        <h1>Booking ${statusDisplay}</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${user.firstName},</p>
        
        <p>Your tee time booking at <strong>${teeTimeListing.club}</strong> has been <strong>${status}</strong>!</p>
        
        <p>${statusMessage}</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing.numberOfPlayers}</p>
          <p><strong>Total Price:</strong> $${teeTimeListing.price.toFixed(2)}</p>
        </div>
        
        <p>You can view your booking details by visiting your account dashboard.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/bookings/${bookingId}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>Thank you for using Linx!</p>
        
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
 * Send a payment confirmation to host when funds are released from escrow
 */
export async function sendHostPaymentConfirmation(user: User, bookingId: number, teeTimeListing: any, amount: number): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send payment confirmation: User has no email address');
    return false;
  }
  
  const subject = `Payment Received: Your Tee Time Funds Released`;
  
  // Make sure we have a name to use
  const firstName = user.firstName || user.username || 'Host';
  
  const date = new Date(teeTimeListing.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const text = `
    Hello ${firstName},

    Good news! The funds for your tee time booking on ${formattedDate} have been released to your account.
    
    Booking details:
    - Club: ${teeTimeListing.club?.name || 'Your club'}
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing.numberOfPlayers}
    - Amount Received: $${amount.toFixed(2)}
    
    The funds should be reflected in your Stripe account within 1-2 business days.
    
    Thank you for hosting with Linx! We hope your guest had a great experience.
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #49DCB1; padding: 20px; text-align: center; color: white;">
        <h1>Payment Received!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Good news! The funds for your tee time booking on <strong>${formattedDate}</strong> have been released to your account.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Payment Details</h2>
          <p><strong>Club:</strong> ${teeTimeListing.club?.name || 'Your club'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing.numberOfPlayers}</p>
          <p><strong>Amount Received:</strong> $${amount.toFixed(2)}</p>
        </div>
        
        <p>The funds should be reflected in your Stripe account within 1-2 business days.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/dashboard" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Dashboard
          </a>
        </div>
        
        <p>Thank you for hosting with Linx! We hope your guest had a great experience.</p>
        
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
 * Send a notification to a host when their tee time is booked
 */
export async function sendHostBookingNotification(user: User, bookingId: number, teeTimeListing: any, guestName: string): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send host booking notification: User has no email address');
    return false;
  }
  
  const subject = `New Booking: Your Tee Time Has Been Reserved`;
  
  // Make sure we have a name to use
  const firstName = user.firstName || user.username || 'Host';
  
  const date = new Date(teeTimeListing.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const text = `
    Hello ${firstName},

    Great news! Your tee time listing has been booked by ${guestName}.
    
    Booking details:
    - Club: ${teeTimeListing.club?.name || 'Your club'}
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing.numberOfPlayers}
    - Total Price: $${teeTimeListing.price.toFixed(2)}
    
    Please log in to your Linx account to view the booking details and communicate with your guest.
    
    Remember, funds will be held in escrow and released to you 24 hours after the scheduled tee time.
    
    Thank you for hosting with Linx!
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>New Booking!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Great news! Your tee time listing has been booked by <strong>${guestName}</strong>.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Club:</strong> ${teeTimeListing.club?.name || 'Your club'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing.numberOfPlayers}</p>
          <p><strong>Total Price:</strong> $${teeTimeListing.price.toFixed(2)}</p>
        </div>
        
        <p>Please log in to your Linx account to view the booking details and communicate with your guest.</p>
        <p>Remember, funds will be held in escrow and released to you 24 hours after the scheduled tee time.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/dashboard" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>Thank you for hosting with Linx!</p>
        
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
 * Send a reminder email one week before tee time
 */
export async function sendOneWeekReminderEmail(user: User, bookingId: number, teeTimeListing: any): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send one week reminder: User has no email address');
    return false;
  }
  
  const subject = `Your Tee Time is One Week Away`;
  
  // Make sure we have a name to use
  const firstName = user.firstName || user.username || 'Golfer';
  
  const date = new Date(teeTimeListing.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const text = `
    Hello ${firstName},

    This is a friendly reminder that your tee time is just one week away!
    
    Booking details:
    - Club: ${teeTimeListing.club?.name || 'Your club booking'}
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing.numberOfPlayers}
    
    If you need to communicate with your host or make any changes to your booking, please log in to your Linx account.
    
    We hope you're looking forward to your golf experience!
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>One Week Until Your Tee Time!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>This is a friendly reminder that your tee time is just <strong>one week away</strong>!</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Club:</strong> ${teeTimeListing.club?.name || 'Your club booking'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing.numberOfPlayers}</p>
        </div>
        
        <p>If you need to communicate with your host or make any changes to your booking, please log in to your Linx account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/bookings/${bookingId}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>We hope you're looking forward to your golf experience!</p>
        
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
 * Send a reminder email one day before tee time
 */
export async function sendOneDayReminderEmail(user: User, bookingId: number, teeTimeListing: any): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send one day reminder: User has no email address');
    return false;
  }
  
  const subject = `Your Tee Time is Tomorrow!`;
  
  // Make sure we have a name to use
  const firstName = user.firstName || user.username || 'Golfer';
  
  const date = new Date(teeTimeListing.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const text = `
    Hello ${firstName},

    Your tee time is tomorrow! Here's everything you need to know:
    
    Booking details:
    - Club: ${teeTimeListing.club?.name || 'Your club booking'}
    - Date: ${formattedDate}
    - Time: ${formattedTime}
    - Number of Players: ${teeTimeListing.numberOfPlayers}
    
    Please arrive at least 15 minutes before your scheduled tee time to check in.
    
    If you need to contact your host, please log in to your Linx account and use the messaging feature.
    
    Enjoy your golf experience!
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>Your Tee Time is Tomorrow!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Your tee time is <strong>tomorrow</strong>! Here's everything you need to know:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Booking Details</h2>
          <p><strong>Club:</strong> ${teeTimeListing.club?.name || 'Your club booking'}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Number of Players:</strong> ${teeTimeListing.numberOfPlayers}</p>
        </div>
        
        <p>Please arrive at least 15 minutes before your scheduled tee time to check in.</p>
        <p>If you need to contact your host, please log in to your Linx account and use the messaging feature.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/bookings/${bookingId}" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Booking
          </a>
        </div>
        
        <p>Enjoy your golf experience!</p>
        
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
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(user: User): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send welcome email: User has no email address');
    return false;
  }
  
  const subject = `Welcome to Linx - Your Account Has Been Created`;
  
  // Make sure we have a name to use
  const firstName = user.firstName || user.username || 'Golfer';
  
  const text = `
    Hello ${firstName},

    Welcome to Linx! Your account has been successfully created.
    
    Linx is the premier marketplace connecting golf enthusiasts with exclusive club tee times. 
    Here's what you can do with your new account:
    
    - Browse available tee times at premier golf clubs
    - Book tee times with verified hosts
    - Track your upcoming and past bookings
    - Rate and review your experiences
    
    To complete your profile and start finding tee times, please visit the profile section.
    
    We're excited to have you as part of our community!

    Thank you for joining Linx!
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>Welcome to Linx!</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>Welcome to Linx! Your account has been successfully created.</p>
        
        <p>Linx is the premier marketplace connecting golf enthusiasts with exclusive club tee times.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #205A50; margin-top: 0;">Here's what you can do with your new account:</h2>
          <ul style="padding-left: 20px; line-height: 1.6;">
            <li>Browse available tee times at premier golf clubs</li>
            <li>Book tee times with verified hosts</li>
            <li>Track your upcoming and past bookings</li>
            <li>Rate and review your experiences</li>
          </ul>
        </div>
        
        <p>To complete your profile and start finding tee times, please visit the profile section.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/profile-onboarding" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Complete Your Profile
          </a>
        </div>
        
        <p>We're excited to have you as part of our community!</p>
        
        <p>Thank you for joining Linx!</p>
        
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
 * Send a new message notification email
 */
export async function sendNewMessageNotification(user: User, senderName: string, messagePreview: string): Promise<boolean> {
  if (!user.email) {
    console.error('Cannot send message notification: User has no email address');
    return false;
  }
  
  const subject = `New Message from ${senderName}`;
  
  // Make sure we have a name to use
  const firstName = user.firstName || user.username || 'Golfer';

  const text = `
    Hello ${firstName},

    You have received a new message from ${senderName}:

    "${messagePreview}"

    Login to your Linx account to view and reply to this message.

    Thank you for using Linx!
    
    The Linx Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #205A50; padding: 20px; text-align: center; color: white;">
        <h1>New Message</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${firstName},</p>
        
        <p>You have received a new message from <strong>${senderName}</strong>:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; font-style: italic;">
          "${messagePreview}"
        </div>
        
        <p>Login to your Linx account to view and reply to this message.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://linxgolfapp.com/messages" style="background-color: #205A50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            View Messages
          </a>
        </div>
        
        <p>Thank you for using Linx!</p>
        
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