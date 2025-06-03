import { storage } from './storage';
import { sendOneWeekReminder, sendOneDayReminder } from './notifications/index';

/**
 * Check for reminders that need to be sent
 * This function should be run periodically (e.g., every hour)
 */
export async function checkReminders(): Promise<void> {
  try {
    console.log('Checking for reminders to send...');
    
    // Get current date
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
async function checkOneWeekReminders(now: Date): Promise<void> {
  try {
    // Get bookings with one week reminder due and not yet sent
    const bookings = await storage.getRemindersToSend('one_week', now);
    
    if (bookings.length === 0) {
      console.log('No one week reminders to send');
      return;
    }
    
    console.log(`Found ${bookings.length} one week reminders to send`);
    
    // Send reminders
    for (const booking of bookings) {
      try {
        await sendOneWeekReminder(booking.id);
        console.log(`One week reminder sent for booking ${booking.id}`);
      } catch (error) {
        console.error(`Error sending one week reminder for booking ${booking.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking one week reminders:', error);
  }
}

/**
 * Check for one day reminders that need to be sent
 */
async function checkOneDayReminders(now: Date): Promise<void> {
  try {
    // Get bookings with one day reminder due and not yet sent
    const bookings = await storage.getRemindersToSend('one_day', now);
    
    if (bookings.length === 0) {
      console.log('No one day reminders to send');
      return;
    }
    
    console.log(`Found ${bookings.length} one day reminders to send`);
    
    // Send reminders
    for (const booking of bookings) {
      try {
        await sendOneDayReminder(booking.id);
        console.log(`One day reminder sent for booking ${booking.id}`);
      } catch (error) {
        console.error(`Error sending one day reminder for booking ${booking.id}:`, error);
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
export function startReminderService(): NodeJS.Timer {
  console.log('Starting reminder service...');
  
  // Run immediately
  checkReminders()
    .catch(err => {
      console.error('Error in reminder service:', err);
    });
  
  // Schedule to run every hour
  const interval = setInterval(() => {
    checkReminders()
      .catch(err => {
        console.error('Error in reminder service:', err);
      });
  }, 60 * 60 * 1000); // 1 hour
  
  return interval;
}