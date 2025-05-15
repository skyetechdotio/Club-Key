const storage = require('./mongo-storage');
const { sendReminderEmail } = require('./notifications/email');

/**
 * Check for reminders that need to be sent
 * This function should be run periodically (e.g., every hour)
 */
async function checkReminders() {
  console.log('Checking for reminders to send...');
  
  try {
    const now = new Date();
    
    // Check for one week reminders
    await checkOneWeekReminders(now);
    
    // Check for one day reminders
    await checkOneDayReminders(now);
    
    console.log('Reminder check completed');
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

/**
 * Check for one week reminders that need to be sent
 */
async function checkOneWeekReminders(now) {
  try {
    const bookings = await storage.getRemindersToSend('one_week', now);
    
    if (bookings.length === 0) {
      console.log('No one week reminders to send');
      return;
    }
    
    console.log(`Sending ${bookings.length} one week reminders`);
    
    for (const booking of bookings) {
      try {
        // Get related data
        const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
        const guest = await storage.getUser(booking.guestId);
        const club = teeTime ? await storage.getClub(teeTime.clubId) : null;
        
        if (!teeTime || !guest || !club) {
          console.error(`Missing data for booking ${booking._id}`);
          continue;
        }
        
        // Send email reminder
        await sendReminderEmail(guest, booking, teeTime, club, 'one_week');
        
        // Mark reminder as sent
        await storage.updateBooking(booking._id, { reminderOneWeekSent: true });
        
        // Create in-app notification
        await storage.createNotification({
          userId: guest._id,
          title: 'Upcoming Tee Time',
          message: `Your tee time at ${club.name} is 1 week away`,
          type: 'booking',
          relatedId: booking._id
        });
        
        console.log(`Sent one week reminder for booking ${booking._id}`);
      } catch (error) {
        console.error(`Error sending reminder for booking ${booking._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking one week reminders:', error);
  }
}

/**
 * Check for one day reminders that need to be sent
 */
async function checkOneDayReminders(now) {
  try {
    const bookings = await storage.getRemindersToSend('one_day', now);
    
    if (bookings.length === 0) {
      console.log('No one day reminders to send');
      return;
    }
    
    console.log(`Sending ${bookings.length} one day reminders`);
    
    for (const booking of bookings) {
      try {
        // Get related data
        const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
        const guest = await storage.getUser(booking.guestId);
        const club = teeTime ? await storage.getClub(teeTime.clubId) : null;
        
        if (!teeTime || !guest || !club) {
          console.error(`Missing data for booking ${booking._id}`);
          continue;
        }
        
        // Send email reminder
        await sendReminderEmail(guest, booking, teeTime, club, 'one_day');
        
        // Mark reminder as sent
        await storage.updateBooking(booking._id, { reminderOneDaySent: true });
        
        // Create in-app notification
        await storage.createNotification({
          userId: guest._id,
          title: 'Upcoming Tee Time Tomorrow',
          message: `Your tee time at ${club.name} is tomorrow`,
          type: 'booking',
          relatedId: booking._id
        });
        
        console.log(`Sent one day reminder for booking ${booking._id}`);
      } catch (error) {
        console.error(`Error sending reminder for booking ${booking._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking one day reminders:', error);
  }
}

/**
 * Start reminder service
 * This function will check for reminders every hour
 */
function startReminderService() {
  console.log('Starting reminder service...');
  
  // Check immediately on startup
  checkReminders();
  
  // Then check every hour
  return setInterval(checkReminders, 60 * 60 * 1000);
}

module.exports = {
  checkReminders,
  startReminderService
};