import schedule from 'node-schedule';
import { storage } from './storage';

/**
 * The BookingService class handles the lifecycle of bookings,
 * including automatic expiration of pending bookings and status transitions.
 * This mimics the functionality of Timekit's booking management system.
 */
export class BookingService {
  private expirationMinutes: number;
  private expirationJob!: schedule.Job; // Using definite assignment assertion

  /**
   * Create a booking service
   * @param expirationMinutes - The number of minutes after which pending bookings expire
   */
  constructor(expirationMinutes: number = 15) {
    this.expirationMinutes = expirationMinutes;
  }

  /**
   * Initialize the booking service
   * Sets up scheduled jobs for pending booking expiration
   */
  public init(): void {
    console.log(`Starting booking service (expiration time: ${this.expirationMinutes} minutes)...`);
    
    // Schedule job to run every minute
    this.expirationJob = schedule.scheduleJob('*/1 * * * *', async () => {
      try {
        await this.expirePendingBookings();
      } catch (error) {
        console.error('Error in booking service expiration job:', error);
      }
    });
    
    // Initial run
    this.expirePendingBookings()
      .catch(err => {
        console.error('Error in initial pending booking expiration:', err);
      });
    
    console.log('Booking service started');
  }
  
  /**
   * Stop the booking service
   */
  public stop(): void {
    if (this.expirationJob) {
      this.expirationJob.cancel();
    }
    console.log('Booking service stopped');
  }
  
  /**
   * Find and expire pending bookings that are older than the specified expiration time
   */
  private async expirePendingBookings(): Promise<void> {
    console.log('Checking for expired pending bookings...');
    
    try {
      // Get pending bookings older than the expiration time
      const expiredBookings = await storage.getPendingBookingsOlderThan(this.expirationMinutes);
      
      if (expiredBookings.length === 0) {
        console.log('No expired pending bookings found');
        return;
      }
      
      console.log(`Found ${expiredBookings.length} expired pending bookings`);
      
      // Process each expired booking
      for (const booking of expiredBookings) {
        try {
          console.log(`Expiring booking ${booking.id} for tee time ${booking.teeTimeId}`);
          
          // Update booking status to 'expired'
          await storage.updateBookingStatus(booking.id, 'expired');
          
          // Update tee time status back to 'available'
          await storage.updateTeeTimeListing(booking.teeTimeId, { status: 'available' });
          
          console.log(`Booking ${booking.id} expired and tee time ${booking.teeTimeId} is available again`);
        } catch (error) {
          console.error(`Error processing expired booking ${booking.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking for expired pending bookings:', error);
    }
  }
  
  /**
   * Create a pending booking for a tee time
   * This mimics Timekit's booking creation flow
   */
  public async createPendingBooking(teeTimeId: number, guestId: number, numberOfPlayers: number, totalPrice: number): Promise<any> {
    try {
      // First change tee time status to pending
      const teeTime = await storage.getTeeTimeListing(teeTimeId);
      
      if (!teeTime) {
        throw new Error(`Tee time ${teeTimeId} not found`);
      }
      
      // Enhanced status checking with better error messages
      if (teeTime.status !== 'available') {
        console.error(`Tee time ${teeTimeId} is not available - status is ${teeTime.status}`);
        
        // Check if there's a pending booking that can be released
        if (teeTime.status === 'pending') {
          // Check how old the pending status is based on createdAt
          const pendingDuration = teeTime.createdAt ? 
            (new Date().getTime() - new Date(teeTime.createdAt).getTime()) / (1000 * 60) : 0;
          
          // If the pending status is older than 10 minutes, consider it stale and reset
          if (pendingDuration > 10) {
            console.log(`Found stale pending status (${pendingDuration.toFixed(2)} mins old) for tee time ${teeTimeId}, resetting to available`);
            await storage.updateTeeTimeListing(teeTimeId, { status: 'available' });
            
            // Now the tee time is available, so we can continue
            teeTime.status = 'available';
          } else {
            throw new Error(`Tee time ${teeTimeId} is currently being booked by another user (${pendingDuration.toFixed(2)} mins). Please try again in a few minutes.`);
          }
        } else {
          throw new Error(`Tee time ${teeTimeId} is not available (current status: ${teeTime.status})`);
        }
      }
      
      // Mark tee time as pending to prevent double bookings (like Timekit's locking feature)
      await storage.updateTeeTimeListing(teeTimeId, { status: 'pending' });
      
      // Create the booking with pending status
      const booking = await storage.createBooking({
        teeTimeId,
        guestId,
        numberOfPlayers,
        totalPrice,
        status: 'pending',
        stripePaymentIntentId: undefined
      });
      
      console.log(`Created pending booking ${booking.id} for tee time ${teeTimeId}`);
      
      return {
        booking,
        teeTime
      };
    } catch (error) {
      // If anything goes wrong, ensure tee time is marked as available again
      try {
        await storage.updateTeeTimeListing(teeTimeId, { status: 'available' });
      } catch (innerError) {
        console.error(`Error resetting tee time ${teeTimeId} status:`, innerError);
      }
      
      throw error;
    }
  }
  
  /**
   * Confirm a pending booking after successful payment
   * This mimics Timekit's confirmation workflow
   */
  public async confirmBooking(bookingId: number, paymentIntentId: string): Promise<any> {
    try {
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        console.error(`Booking confirmation failed: Booking ${bookingId} not found`);
        throw new Error(`Booking ${bookingId} not found`);
      }
      
      // Add additional checks to handle race conditions
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (!teeTime) {
        console.error(`Booking confirmation failed: Tee time ${booking.teeTimeId} not found`);
        throw new Error(`Tee time ${booking.teeTimeId} not found`);
      }
      
      // Check if another booking has already been confirmed for this tee time
      if (teeTime.status === 'booked' && booking.status !== 'confirmed') {
        console.error(`Booking confirmation failed: Tee time ${booking.teeTimeId} is already booked by someone else`);
        
        // Update this booking to cancelled since we can't confirm it
        await storage.updateBookingStatus(bookingId, 'cancelled');
        
        throw new Error(`Tee time ${booking.teeTimeId} is already booked by another user`);
      }
      
      // Allow confirmation of bookings in these states only
      const validStates = ['pending', 'payment_pending', 'payment_processing'];
      if (!validStates.includes(booking.status)) {
        console.error(`Booking confirmation failed: Booking ${bookingId} cannot be confirmed (current status: ${booking.status})`);
        throw new Error(`Booking ${bookingId} cannot be confirmed (current status: ${booking.status})`);
      }
      
      console.log(`Attempting to confirm booking ${bookingId} with current status ${booking.status}`);
      
      // If there's already a payment intent saved, don't overwrite it
      let paymentToUse = paymentIntentId;
      if (booking.stripePaymentIntentId && !paymentIntentId) {
        paymentToUse = booking.stripePaymentIntentId;
      }
      
      // Update booking status to confirmed
      const updatedBooking = await storage.updateBooking(bookingId, {
        status: 'confirmed',
        stripePaymentIntentId: paymentToUse
      });
      
      // Update tee time status to booked
      await storage.updateTeeTimeListing(booking.teeTimeId, { status: 'booked' });
      
      console.log(`Successfully confirmed booking ${bookingId} for tee time ${booking.teeTimeId} with payment ${paymentToUse}`);
      
      return updatedBooking;
    } catch (error) {
      console.error(`Error confirming booking ${bookingId}:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel a booking and make the tee time available again
   * This mimics Timekit's cancellation workflow
   */
  public async cancelBooking(bookingId: number, reason?: string): Promise<any> {
    const booking = await storage.getBooking(bookingId);
    
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }
    
    // Update booking status to cancelled
    const updatedBooking = await storage.updateBooking(bookingId, {
      status: 'cancelled'
    });
    
    // Update tee time status to available
    await storage.updateTeeTimeListing(booking.teeTimeId, { status: 'available' });
    
    console.log(`Cancelled booking ${bookingId} for tee time ${booking.teeTimeId}. Reason: ${reason || 'Not specified'}`);
    
    return updatedBooking;
  }
}

// Export a singleton instance
const bookingService = new BookingService();
export default bookingService;