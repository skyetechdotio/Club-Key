import { storage } from '../storage';
import { User, Booking, Message } from '@shared/schema';
import { 
  sendBookingConfirmation, 
  sendBookingStatusUpdate, 
  sendNewMessageNotification,
  sendHostBookingNotification,
  sendOneWeekReminderEmail,
  sendOneDayReminderEmail,
  sendHostPaymentConfirmation
} from './email';

/**
 * Send notifications for a new booking
 */
export async function notifyNewBooking(bookingId: number): Promise<void> {
  try {
    // Get booking details
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Get tee time details
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }

    // Get host details
    const host = await storage.getUser(teeTime.hostId);
    if (!host) {
      throw new Error(`Host ${teeTime.hostId} not found`);
    }

    // Get guest details
    const guest = await storage.getUser(booking.guestId);
    if (!guest) {
      throw new Error(`Guest ${booking.guestId} not found`);
    }

    // Get club details
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }

    // Create in-app notification for host
    await createNotification({
      userId: teeTime.hostId,
      title: 'New Booking',
      message: `${guest.firstName} ${guest.lastName} has booked your tee time at ${club.name}`,
      type: 'booking',
      relatedId: bookingId,
      isRead: false
    });

    // Create in-app notification for guest
    await createNotification({
      userId: booking.guestId,
      title: 'Booking Confirmed',
      message: `Your booking with ${host.firstName} ${host.lastName} at ${club.name} is confirmed`,
      type: 'booking',
      relatedId: bookingId,
      isRead: false
    });

    // Prepare tee time details for emails
    const teeTimeDetails = {
      date: teeTime.date,
      price: booking.totalPrice,
      numberOfPlayers: booking.numberOfPlayers,
      club: {
        name: club.name
      }
    };

    // Send email notification to guest
    await sendBookingConfirmation(guest, bookingId, teeTimeDetails);
    
    // Send email notification to host
    const guestFullName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || guest.username;
    await sendHostBookingNotification(host, bookingId, teeTimeDetails, guestFullName);
    
    // Schedule reminder emails
    await scheduleReminderEmails(bookingId);

  } catch (error) {
    console.error('Error sending booking notifications:', error);
  }
}

/**
 * Send notifications for booking status changes
 */
export async function notifyBookingStatusChange(bookingId: number, newStatus: string): Promise<void> {
  try {
    // Get booking details
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Get tee time details
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }

    // Get host details
    const host = await storage.getUser(teeTime.hostId);
    if (!host) {
      throw new Error(`Host ${teeTime.hostId} not found`);
    }

    // Get guest details
    const guest = await storage.getUser(booking.guestId);
    if (!guest) {
      throw new Error(`Guest ${booking.guestId} not found`);
    }

    // Get club details
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }

    // Create in-app notification for guest
    await createNotification({
      userId: booking.guestId,
      title: `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: `Your booking at ${club.name} has been ${newStatus}`,
      type: 'booking_status',
      relatedId: bookingId,
      isRead: false
    });

    // Send email notification to guest
    const teeTimeDetails = {
      date: teeTime.date,
      club: club.name,
      price: booking.totalPrice,
      numberOfPlayers: booking.numberOfPlayers
    };

    await sendBookingStatusUpdate(guest, bookingId, newStatus, teeTimeDetails);

  } catch (error) {
    console.error('Error sending booking status notifications:', error);
  }
}

/**
 * Send notifications for new messages
 */
export async function notifyNewMessage(messageId: number): Promise<void> {
  try {
    // Get message details
    const message = await storage.getMessage(messageId);
    if (!message) {
      throw new Error(`Message ${messageId} not found`);
    }

    // Get sender details
    const sender = await storage.getUser(message.senderId);
    if (!sender) {
      throw new Error(`Sender ${message.senderId} not found`);
    }

    // Get receiver details
    const receiver = await storage.getUser(message.receiverId);
    if (!receiver) {
      throw new Error(`Receiver ${message.receiverId} not found`);
    }

    // Create in-app notification
    await createNotification({
      userId: message.receiverId,
      title: 'New Message',
      message: `You have a new message from ${sender.firstName} ${sender.lastName}`,
      type: 'message',
      relatedId: messageId,
      isRead: false
    });

    // Create a preview of the message (first 50 characters)
    const messagePreview = message.content.length > 50 
      ? `${message.content.substring(0, 50)}...` 
      : message.content;

    // Send email notification
    await sendNewMessageNotification(receiver, `${sender.firstName} ${sender.lastName}`, messagePreview);

  } catch (error) {
    console.error('Error sending message notifications:', error);
  }
}

/**
 * Send payment confirmation to host
 */
export async function notifyHostPayment(bookingId: number, amount: number): Promise<void> {
  try {
    // Get booking details
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Get tee time details
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }

    // Get host details
    const host = await storage.getUser(teeTime.hostId);
    if (!host) {
      throw new Error(`Host ${teeTime.hostId} not found`);
    }

    // Get club details
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }

    // Create in-app notification for host
    await createNotification({
      userId: teeTime.hostId,
      title: 'Payment Released',
      message: `You've received $${amount.toFixed(2)} for the tee time booking at ${club.name}`,
      type: 'payment',
      relatedId: bookingId,
      isRead: false
    });

    // Send email notification
    const teeTimeDetails = {
      date: teeTime.date,
      club: {
        name: club.name
      },
      numberOfPlayers: booking.numberOfPlayers
    };

    await sendHostPaymentConfirmation(host, bookingId, teeTimeDetails, amount);

  } catch (error) {
    console.error('Error sending payment notification:', error);
  }
}

// Function removed to fix duplicate implementation

/**
 * Schedule reminder emails for tee time booking
 */
export async function scheduleReminderEmails(bookingId: number): Promise<void> {
  try {
    // Get booking details
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Get tee time details
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }

    const teeTimeDate = new Date(teeTime.date);
    
    // Calculate one week before
    const oneWeekBefore = new Date(teeTimeDate);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
    
    // Calculate one day before
    const oneDayBefore = new Date(teeTimeDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    
    // Update booking with reminder dates
    await storage.updateBooking(bookingId, {
      reminderOneWeek: oneWeekBefore,
      reminderOneDay: oneDayBefore,
      reminderOneWeekSent: false,
      reminderOneDaySent: false
    });
    
    console.log(`Scheduled reminders for booking ${bookingId}: One week: ${oneWeekBefore.toISOString()}, One day: ${oneDayBefore.toISOString()}`);
    
  } catch (error) {
    console.error('Error scheduling reminder emails:', error);
  }
}

/**
 * Send one week reminder notification
 */
export async function sendOneWeekReminder(bookingId: number): Promise<void> {
  try {
    // Get booking details
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Check if reminder is already sent
    if (booking.reminderOneWeekSent) {
      console.log(`One week reminder for booking ${bookingId} already sent`);
      return;
    }

    // Get tee time details
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }

    // Get guest details
    const guest = await storage.getUser(booking.guestId);
    if (!guest) {
      throw new Error(`Guest ${booking.guestId} not found`);
    }

    // Get club details
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }

    // Create in-app notification for guest
    await createNotification({
      userId: booking.guestId,
      title: 'Upcoming Tee Time',
      message: `Your tee time at ${club.name} is one week away`,
      type: 'reminder',
      relatedId: bookingId,
      isRead: false
    });

    // Send email notification
    const teeTimeDetails = {
      date: teeTime.date,
      club: {
        name: club.name
      },
      numberOfPlayers: booking.numberOfPlayers
    };

    await sendOneWeekReminderEmail(guest, bookingId, teeTimeDetails);
    
    // Mark reminder as sent
    await storage.updateBooking(bookingId, {
      reminderOneWeekSent: true
    });
    
  } catch (error) {
    console.error('Error sending one week reminder:', error);
  }
}

/**
 * Send one day reminder notification
 */
export async function sendOneDayReminder(bookingId: number): Promise<void> {
  try {
    // Get booking details
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // Check if reminder is already sent
    if (booking.reminderOneDaySent) {
      console.log(`One day reminder for booking ${bookingId} already sent`);
      return;
    }

    // Get tee time details
    const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
    if (!teeTime) {
      throw new Error(`Tee time ${booking.teeTimeId} not found`);
    }

    // Get guest details
    const guest = await storage.getUser(booking.guestId);
    if (!guest) {
      throw new Error(`Guest ${booking.guestId} not found`);
    }

    // Get club details
    const club = await storage.getClub(teeTime.clubId);
    if (!club) {
      throw new Error(`Club ${teeTime.clubId} not found`);
    }

    // Create in-app notification for guest
    await createNotification({
      userId: booking.guestId,
      title: 'Your Tee Time is Tomorrow',
      message: `Don't forget your tee time at ${club.name} tomorrow!`,
      type: 'reminder',
      relatedId: bookingId,
      isRead: false
    });

    // Send email notification
    const teeTimeDetails = {
      date: teeTime.date,
      club: {
        name: club.name
      },
      numberOfPlayers: booking.numberOfPlayers
    };

    await sendOneDayReminderEmail(guest, bookingId, teeTimeDetails);
    
    // Mark reminder as sent
    await storage.updateBooking(bookingId, {
      reminderOneDaySent: true
    });
    
  } catch (error) {
    console.error('Error sending one day reminder:', error);
  }
}

/**
 * Create an in-app notification
 */
export async function createNotification(data: {
  userId: number;
  title: string;
  message: string;
  type: string;
  relatedId: number;
  isRead: boolean;
}): Promise<void> {
  try {
    await storage.createNotification(data);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}