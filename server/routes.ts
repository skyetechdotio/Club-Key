import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import Stripe from "stripe";
import { z } from "zod";
import bookingService from "./booking-service";
import { 
  insertUserSchema, 
  insertClubSchema, 
  insertUserClubSchema, 
  insertTeeTimeListingSchema, 
  insertBookingSchema, 
  insertReviewSchema, 
  insertMessageSchema,
  insertNotificationSchema
} from "@shared/schema";
import notificationsRoutes from './routes/notifications';
import { setupAuth, isAuthenticated, isHost, hashPassword } from "./auth";

// Check for required Stripe API keys
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('CRITICAL ERROR: Missing STRIPE_SECRET_KEY environment variable');
  // Don't use a placeholder for production as it will cause API errors
}

// Verify Stripe webhook secret is configured
if (process.env.STRIPE_WEBHOOK_SECRET) {
  console.log('Stripe webhook secret is properly configured');
} else {
  console.warn('Missing STRIPE_WEBHOOK_SECRET environment variable, webhook verification will fail');
}

// Initialize Stripe with the secret key
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16" as any,
  });
} else {
  console.warn(
    "STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled. This is for UI testing only."
  );
}

// Active WebSocket connections
const connections = new Map<number, WebSocket>();

// Keep track of processed webhook events to avoid duplicates
const processedEvents = new Set<string>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication with our simplified approach
  await setupAuth(app);
  
  // DEVELOPMENT ONLY: Test route to create or reset test user
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/test/reset-test-user', async (req, res) => {
      try {
        console.log('Resetting test user password...');
        let testUser = await storage.getUserByEmail('test@example.com');
        
        if (!testUser) {
          console.log('Test user not found, creating one...');
          // Create a test user if one doesn't exist
          testUser = await storage.createUser({
            username: 'testuser',
            email: 'test@example.com',
            password: 'temporary', // Will be overwritten below
            firstName: 'Test',
            lastName: 'User',
            isHost: false
          });
          console.log('Test user created with ID:', testUser.id);
        }
        
        // Hash "password123" for the test user
        const hashedPassword = await hashPassword('password123');
        
        // Update the test user's password
        console.log('Updating password for test user ID:', testUser.id);
        const updatedUser = await storage.updateUser(testUser.id, {
          password: hashedPassword
        });
        
        console.log('Test user password reset successful');
        res.json({ message: 'Test user password reset successful', userId: testUser.id });
      } catch (error) {
        console.error('Error resetting test user password:', error);
        res.status(500).json({ message: 'Error resetting test user password', error: String(error) });
      }
    });
  }
  
  // Register all routes that use auth

  // User routes
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Set cache control headers to prevent caching for user profile data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
      
      // Log for debugging
      console.log(`Fetching user ${userId} - updatedAt:`, user.updatedAt);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Make sure users can only update their own profile
      if ((req.user as any).id !== userId) {
        return res.status(403).json({ message: 'You can only update your own profile' });
      }
      
      const userData = req.body;
      
      console.log(`Processing profile update for user ${userId}:`, userData);
      
      // Don't allow changing email or password this way
      delete userData.email;
      delete userData.password;
      
      // Add a timestamp to force cache refresh in browser
      userData.updatedAt = new Date();
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      console.log(`Profile updated successfully for user ${userId}:`, userWithoutPassword);
      
      // Set cache control headers to prevent caching
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Error updating user: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Club routes
  app.get('/api/clubs', async (req, res) => {
    try {
      const clubs = await storage.getClubs();
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching clubs' });
    }
  });
  
  app.get('/api/clubs/:id', async (req, res) => {
    try {
      const clubId = parseInt(req.params.id);
      const club = await storage.getClub(clubId);
      
      if (!club) {
        return res.status(404).json({ message: 'Club not found' });
      }
      
      res.json(club);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching club' });
    }
  });
  
  app.post('/api/clubs', isAuthenticated, async (req, res) => {
    try {
      const clubData = insertClubSchema.parse(req.body);
      const club = await storage.createClub(clubData);
      res.status(201).json(club);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', details: error.errors });
      }
      res.status(500).json({ message: 'Error creating club' });
    }
  });

  // User Club routes
  app.get('/api/users/:userId/clubs', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userClubs = await storage.getUserClubs(userId);
      
      // Get full club details
      const clubDetails = await Promise.all(
        userClubs.map(async (userClub) => {
          const club = await storage.getClub(userClub.clubId);
          return {
            ...userClub,
            club,
          };
        })
      );
      
      res.json(clubDetails);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user clubs' });
    }
  });
  
  app.post('/api/user-clubs', isAuthenticated, async (req, res) => {
    try {
      const userClubData = insertUserClubSchema.parse(req.body);
      
      // Ensure the user is adding themselves to a club
      if ((req.user as any).id !== userClubData.userId) {
        return res.status(403).json({ message: 'You can only add yourself to a club' });
      }
      
      const userClub = await storage.addUserToClub(userClubData);
      res.status(201).json(userClub);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', details: error.errors });
      }
      res.status(500).json({ message: 'Error adding user to club' });
    }
  });

  // Tee Time Listing routes
  app.get('/api/tee-times', async (req, res) => {
    try {
      const { location, date, endDate, players, distance } = req.query;
      let teeTimeListings = await storage.getAvailableTeeTimeListings();
      
      // Get detailed information
      let detailedListings = await Promise.all(
        teeTimeListings.map(async (listing) => {
          const host = await storage.getUser(listing.hostId);
          const club = await storage.getClub(listing.clubId);
          const hostReviews = await storage.getReviewsByTargetId(listing.hostId, 'host');
          
          // Calculate average rating
          const avgRating = hostReviews.length > 0
            ? hostReviews.reduce((sum, review) => sum + review.rating, 0) / hostReviews.length
            : 0;
          
          return {
            ...listing,
            host: host ? { 
              id: host.id, 
              username: host.username,
              firstName: host.firstName,
              lastName: host.lastName,
              profileImage: host.profileImage,
            } : undefined,
            club,
            hostRating: avgRating,
            reviewCount: hostReviews.length,
            relevanceScore: 0 // Default relevance score
          };
        })
      );
      
      console.log("Filter params:", { location, date, endDate, players, distance });
      
      // Apply explicit filters first (before ranking)
      if (date && typeof date === 'string') {
        try {
          const startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0); // Start of day
          
          // If endDate is provided, filter by date range
          if (endDate && typeof endDate === 'string') {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999); // End of day
            
            console.log(`Filtering by date range: ${startDate.toISOString()} to ${endDateObj.toISOString()}`);
            
            detailedListings = detailedListings.filter(listing => {
              const listingDate = new Date(listing.date);
              return listingDate >= startDate && listingDate <= endDateObj;
            });
            
            console.log(`After date range filter: ${detailedListings.length} listings`);
          }
          // If it's a Saturday (This Weekend filter), get Saturday and Sunday
          else if (startDate.getDay() === 6) { // 6 is Saturday
            console.log("Weekend filter detected");
            // Get the next day (Sunday)
            const sunday = new Date(startDate);
            sunday.setDate(sunday.getDate() + 1);
            sunday.setHours(23, 59, 59, 999); // End of day
            
            console.log(`Filtering by weekend: ${startDate.toISOString()} to ${sunday.toISOString()}`);
            
            detailedListings = detailedListings.filter(listing => {
              const listingDate = new Date(listing.date);
              return listingDate >= startDate && listingDate <= sunday;
            });
            
            console.log(`After weekend filter: ${detailedListings.length} listings`);
          } else {
            // For regular date filters, find exact day match
            const endOfDay = new Date(startDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            console.log(`Filtering by single date: ${startDate.toISOString()} to ${endOfDay.toISOString()}`);
            
            detailedListings = detailedListings.filter(listing => {
              const listingDate = new Date(listing.date);
              return listingDate >= startDate && listingDate <= endOfDay;
            });
            
            console.log(`After exact date filter: ${detailedListings.length} listings`);
          }
        } catch (e) {
          console.error("Error parsing date:", e);
          // Invalid date format, ignore filter
        }
      }
      
      // Price filters have been removed as requested
      
      // Apply players filter
      if (players && typeof players === 'string') {
        const requestedPlayers = parseInt(players);
        if (!isNaN(requestedPlayers)) {
          detailedListings = detailedListings.filter(listing => listing.playersAllowed >= requestedPlayers);
          console.log(`After players filter (${requestedPlayers}): ${detailedListings.length} listings`);
        }
      }
      
      // Apply distance filter if both location and distance are provided
      if (location && distance && typeof location === 'string' && typeof distance === 'string' && distance !== 'any') {
        try {
          const maxDistance = parseInt(distance);
          if (!isNaN(maxDistance)) {
            console.log(`Applying distance filter: ${maxDistance} miles from ${location}`);
            
            // For each listing, calculate the approximate distance from the search location
            // In a real implementation, this would use a geocoding service to find exact coordinates
            // For now, we'll implement a simple check based on location string matching
            
            detailedListings = detailedListings.filter(listing => {
              const clubLocation = listing.club?.location || '';
              const searchLocation = location || '';
              
              // If the listing's club has a location that exactly matches the search, it's 0 miles away
              if (clubLocation.toLowerCase() === searchLocation.toLowerCase()) {
                return true;
              }
              
              // If the listing's club location contains the search location or vice versa, assume it's within the distance
              // This is a simplification - in a real app you'd use latitude/longitude coordinates with the haversine formula
              if (clubLocation && 
                  (clubLocation.toLowerCase().includes(searchLocation.toLowerCase()) ||
                  searchLocation.toLowerCase().includes(clubLocation.toLowerCase()))) {
                // Assume it's within the specified distance
                return true;
              }
              
              // If locations share a city or state, assume they're within larger distances only
              const searchParts = searchLocation.toLowerCase().split(',').map(part => part.trim());
              const listingParts = clubLocation ? clubLocation.toLowerCase().split(',').map(part => part.trim()) : [];
              
              const sharesCityOrState = searchParts.some(part => 
                listingParts.includes(part) && part.length > 0
              );
              
              if (sharesCityOrState) {
                // If they share a city/state, assume they're within 50 miles
                return maxDistance >= 50;
              }
              
              // For larger search radii, include some results from different areas too
              return maxDistance >= 100;
            });
            
            console.log(`After distance filter (${maxDistance} miles): ${detailedListings.length} listings`);
          }
        } catch (e) {
          console.error("Error applying distance filter:", e);
        }
      }
      
      // Apply relevance scoring for sorting results
      detailedListings = detailedListings.map(listing => {
        let relevanceScore = 0;
        
        // Location relevance (highest priority - up to 20 points)
        if (location && typeof location === 'string') {
          const searchTerms = location.toLowerCase().split(/[ ,]+/); // Split by space or comma
          const clubLocation = listing.club?.location?.toLowerCase() || '';
          const clubName = listing.club?.name?.toLowerCase() || '';
          
          searchTerms.forEach(term => {
            // Exact match in location gives highest score
            if (clubLocation.includes(term)) {
              relevanceScore += 10;
              // Bonus points for exact city/state match
              if (clubLocation.split(',').some(part => part.trim() === term.trim())) {
                relevanceScore += 5;
              }
            }
            
            // Match in club name
            if (clubName.includes(term)) {
              relevanceScore += 5;
            }
          });
        }
        
        return {
          ...listing,
          relevanceScore
        };
      });
      
      // Sort by relevance score (highest first)
      detailedListings.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      console.log(`Returning ${detailedListings.length} listings after all filters`);
      res.json(detailedListings);
    } catch (error) {
      console.error("Error in tee times endpoint:", error);
      res.status(500).json({ message: 'Error fetching tee time listings' });
    }
  });
  
  app.get('/api/tee-times/:id', async (req, res) => {
    try {
      const teeTimeId = parseInt(req.params.id);
      const teeTime = await storage.getTeeTimeListing(teeTimeId);
      
      if (!teeTime) {
        return res.status(404).json({ message: 'Tee time listing not found' });
      }
      
      // Get detailed information
      const host = await storage.getUser(teeTime.hostId);
      const club = await storage.getClub(teeTime.clubId);
      const hostReviews = await storage.getReviewsByTargetId(teeTime.hostId, 'host');
      
      // Calculate average rating
      const avgRating = hostReviews.length > 0
        ? hostReviews.reduce((sum, review) => sum + review.rating, 0) / hostReviews.length
        : 0;
      
      res.json({
        ...teeTime,
        host: host ? { 
          id: host.id, 
          username: host.username,
          firstName: host.firstName,
          lastName: host.lastName,
          profileImage: host.profileImage,
        } : undefined,
        club,
        hostRating: avgRating,
        reviewCount: hostReviews.length,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching tee time listing' });
    }
  });
  
  app.get('/api/hosts/:hostId/tee-times', async (req, res) => {
    try {
      const hostId = parseInt(req.params.hostId);
      const teeTimeListings = await storage.getTeeTimeListingsByHostId(hostId);
      
      // Get detailed information
      const detailedListings = await Promise.all(
        teeTimeListings.map(async (listing) => {
          const club = await storage.getClub(listing.clubId);
          return {
            ...listing,
            club,
          };
        })
      );
      
      res.json(detailedListings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching host tee time listings' });
    }
  });
  
  app.post('/api/tee-times', isAuthenticated, isHost, async (req, res) => {
    try {
      // First make sure the date is properly formatted as a Date object
      if (req.body.date && typeof req.body.date === 'string') {
        req.body.date = new Date(req.body.date);
      }
      
      const teeTimeData = insertTeeTimeListingSchema.parse(req.body);
      
      // Check if the user is creating a tee time for themselves
      if ((req.user as any).id !== teeTimeData.hostId) {
        return res.status(403).json({ message: 'You can only create tee times for yourself' });
      }
      
      const teeTime = await storage.createTeeTimeListing(teeTimeData);
      res.status(201).json(teeTime);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', details: error.errors });
      }
      res.status(500).json({ message: 'Error creating tee time listing' });
    }
  });
  
  app.put('/api/tee-times/:id', isAuthenticated, isHost, async (req, res) => {
    try {
      const teeTimeId = parseInt(req.params.id);
      const teeTimeData = req.body;
      
      // Check if tee time exists
      const existingTeeTime = await storage.getTeeTimeListing(teeTimeId);
      if (!existingTeeTime) {
        return res.status(404).json({ message: 'Tee time listing not found' });
      }
      
      // Check if the user owns this tee time
      if ((req.user as any).id !== existingTeeTime.hostId) {
        return res.status(403).json({ message: 'You can only update your own tee times' });
      }
      
      const updatedTeeTime = await storage.updateTeeTimeListing(teeTimeId, teeTimeData);
      res.json(updatedTeeTime);
    } catch (error) {
      res.status(500).json({ message: 'Error updating tee time listing' });
    }
  });

  // Booking routes
  app.get('/api/bookings/:id', isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Only the guest or the host of the tee time can view the booking
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if ((req.user as any).id !== booking.guestId && (req.user as any).id !== teeTime?.hostId) {
        return res.status(403).json({ message: 'You do not have permission to view this booking' });
      }
      
      // Get detailed information
      const guest = await storage.getUser(booking.guestId);
      const detailedBooking = {
        ...booking,
        guest: guest ? { 
          id: guest.id, 
          username: guest.username,
          firstName: guest.firstName,
          lastName: guest.lastName,
          profileImage: guest.profileImage,
        } : undefined,
        teeTime,
      };
      
      res.json(detailedBooking);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking' });
    }
  });
  
  // PATCH endpoint to update a booking - supports the new payment/confirmation flow
  app.patch('/api/bookings/:id', isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Only the guest or host can update the booking
      const userId = (req.user as any).id;
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      
      if (booking.guestId !== userId && teeTime?.hostId !== userId) {
        return res.status(403).json({ message: 'You are not authorized to update this booking' });
      }
      
      // Validate the request body
      const { status, stripePaymentIntentId } = req.body;
      
      // If attempting to confirm the booking
      if (status === 'confirmed') {
        console.log(`Attempting to confirm booking ${bookingId} with payment intent ${stripePaymentIntentId || '(none)'}`);
        
        // Try to use booking service for confirmation if payment intent ID is provided
        if (stripePaymentIntentId) {
          try {
            console.log(`Using booking service to confirm booking ${bookingId}`);
            const confirmedBooking = await bookingService.confirmBooking(bookingId, stripePaymentIntentId);
            
            console.log(`Successfully confirmed booking ${bookingId} through booking service`);
            return res.json(confirmedBooking);
          } catch (confirmError) {
            console.error(`Error in booking service confirmation for ${bookingId}:`, confirmError);
            // Fall through to manual update below
          }
        }
        
        // Manual confirmation fallback
        console.log(`Manually confirming booking ${bookingId}`);
        
        // Update booking status
        const updatedBooking = await storage.updateBookingStatus(bookingId, 'confirmed');
        
        if (stripePaymentIntentId) {
          // Also update the payment intent ID if provided
          await storage.updateBooking(bookingId, { stripePaymentIntentId });
        }
        
        // Update tee time status
        if (booking.teeTimeId) {
          await storage.updateTeeTimeListing(booking.teeTimeId, { status: 'booked' });
        }
        
        // Send confirmation notification
        try {
          const notificationsModule = await import('./notifications');
          if (notificationsModule.notifyBookingStatusChange) {
            await notificationsModule.notifyBookingStatusChange(bookingId, 'confirmed');
          }
        } catch (notifyError) {
          console.error(`Error sending confirmation notification for booking ${bookingId}:`, notifyError);
        }
        
        console.log(`Booking ${bookingId} successfully confirmed manually`);
        return res.json(updatedBooking);
      } else {
        // For other updates, just update the booking
        const updatedBooking = await storage.updateBooking(bookingId, req.body);
        return res.json(updatedBooking);
      }
    } catch (error: any) {
      console.error('Error updating booking:', error);
      res.status(500).json({ message: error.message || 'Error updating booking' });
    }
  });
  
  app.get('/api/users/:userId/bookings', isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own bookings
      if ((req.user as any).id !== userId) {
        return res.status(403).json({ message: 'You can only view your own bookings' });
      }
      
      const bookings = await storage.getBookingsByGuestId(userId);
      
      // Get detailed information
      const detailedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
          const club = teeTime ? await storage.getClub(teeTime.clubId) : undefined;
          const host = teeTime ? await storage.getUser(teeTime.hostId) : undefined;
          
          return {
            ...booking,
            teeTime,
            club,
            host: host ? { 
              id: host.id, 
              username: host.username,
              firstName: host.firstName,
              lastName: host.lastName,
              profileImage: host.profileImage,
            } : undefined,
          };
        })
      );
      
      res.json(detailedBookings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user bookings' });
    }
  });
  
  app.get('/api/hosts/:hostId/bookings', isAuthenticated, isHost, async (req, res) => {
    try {
      const hostId = parseInt(req.params.hostId);
      
      // Hosts can only view bookings for their own tee times
      if ((req.user as any).id !== hostId) {
        return res.status(403).json({ message: 'You can only view bookings for your own tee times' });
      }
      
      // Get all tee times for host
      const hostTeeTimes = await storage.getTeeTimeListingsByHostId(hostId);
      
      // Get bookings for each tee time
      const allBookings = [];
      for (const teeTime of hostTeeTimes) {
        const bookings = await storage.getBookingsByTeeTimeId(teeTime.id);
        for (const booking of bookings) {
          const guest = await storage.getUser(booking.guestId);
          allBookings.push({
            ...booking,
            teeTime,
            guest: guest ? { 
              id: guest.id, 
              username: guest.username,
              firstName: guest.firstName,
              lastName: guest.lastName,
              profileImage: guest.profileImage,
            } : undefined,
          });
        }
      }
      
      res.json(allBookings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching host bookings' });
    }
  });
  
  app.post('/api/bookings', isAuthenticated, async (req, res) => {
    try {
      // Use our updated schema with optional fields
      console.log('Creating booking with data:', req.body);
      
      // Validate with the updated schema
      let bookingData;
      try {
        bookingData = insertBookingSchema.parse(req.body);
      } catch (validationError) {
        console.error('Booking validation error:', validationError);
        return res.status(400).json({ 
          message: 'Invalid booking data', 
          errors: validationError 
        });
      }
      
      const { teeTimeId, guestId, numberOfPlayers, totalPrice, status, stripePaymentIntentId } = bookingData;
      
      // Check if user is booking for themselves
      if ((req.user as any).id !== guestId) {
        return res.status(403).json({ message: 'You can only create bookings for yourself' });
      }
      
      // Check if tee time exists
      const teeTime = await storage.getTeeTimeListing(teeTimeId);
      if (!teeTime) {
        console.error(`Booking failed: Tee time listing ${teeTimeId} not found`);
        return res.status(404).json({ message: 'Tee time listing not found' });
      }
      
      // Check if there are any pending bookings for this tee time
      const existingBookings = await storage.getBookingsByTeeTimeId(teeTimeId);
      const pendingBookings = existingBookings.filter(b => 
        b.status === 'pending' || 
        b.status === 'payment_pending' || 
        b.status === 'payment_processing'
      );
      
      if (pendingBookings.length > 0) {
        console.error(`Booking failed: Tee time ${teeTimeId} already has pending bookings:`, 
          pendingBookings.map(b => ({ id: b.id, status: b.status }))
        );
        return res.status(409).json({ 
          message: `This tee time is currently being booked by someone else. Please try again in a few minutes.`,
          pendingBookings: pendingBookings.length
        });
      }
      
      // Explicitly check tee time status - better error messaging
      if (teeTime.status !== 'available') {
        console.error(`Booking failed: Tee time ${teeTimeId} is not available, current status: ${teeTime.status}`);
        return res.status(400).json({ 
          message: `This tee time is no longer available (current status: ${teeTime.status})`,
          status: teeTime.status 
        });
      }
      
      console.log(`Creating booking for tee time ${teeTimeId} with payment intent: ${stripePaymentIntentId || 'none'}`);
      
      let booking;
      
      if (stripePaymentIntentId) {
        // First create a pending booking
        booking = await bookingService.createPendingBooking(
          teeTimeId,
          guestId,
          numberOfPlayers,
          totalPrice
        );
        
        console.log(`Created pending booking ${booking.id}, now confirming with payment ${stripePaymentIntentId}`);
        
        // Then immediately confirm it with the payment ID
        booking = await bookingService.confirmBooking(booking.id, stripePaymentIntentId);
        
        console.log(`Booking ${booking.id} confirmed with payment ${stripePaymentIntentId}`);
      } else {
        // Use booking service to create a pending booking (legacy flow)
        // This handles setting tee time status to pending and creating the booking record
        booking = await bookingService.createPendingBooking(
          teeTimeId,
          guestId,
          numberOfPlayers,
          totalPrice
        );
      }
      
      // Send booking notifications
      try {
        // Import here to avoid circular dependencies
        const { notifyNewBooking } = require('./notifications');
        await notifyNewBooking(booking.id);
        console.log(`Sent notifications for new booking ${booking.id}`);
      } catch (notificationError) {
        console.error('Error sending booking notifications:', notificationError);
        // Don't fail the request just because notification failed
      }
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', details: error.errors });
      }
      console.error('Error creating booking:', error);
      res.status(500).json({ message: 'Error creating booking', error: (error as Error).message });
    }
  });
  
  app.put('/api/bookings/:id/status', isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // Check if booking exists
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Check if user is the guest or the host
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if ((req.user as any).id !== booking.guestId && (req.user as any).id !== teeTime?.hostId) {
        return res.status(403).json({ message: 'You do not have permission to update this booking' });
      }
      
      let updatedBooking;
      
      // Use booking service for status transitions when applicable
      if (status === 'cancelled') {
        try {
          // Use booking service to handle cancellation properly
          updatedBooking = await bookingService.cancelBooking(bookingId, 'Cancelled by user/host');
          console.log(`Booking ${bookingId} cancelled through booking service`);
        } catch (error) {
          console.error(`Error using booking service to cancel booking ${bookingId}:`, error);
          // Fall back to manual update
          updatedBooking = await storage.updateBookingStatus(bookingId, status);
          
          // Also update tee time status manually as fallback
          if (teeTime) {
            await storage.updateTeeTimeListing(teeTime.id, { status: 'available' });
          }
        }
      } else if (status === 'confirmed' && booking.status === 'pending') {
        try {
          // Use booking service to handle confirmation
          updatedBooking = await bookingService.confirmBooking(bookingId, booking.stripePaymentIntentId || '');
          console.log(`Booking ${bookingId} confirmed through booking service`);
        } catch (error) {
          console.error(`Error using booking service to confirm booking ${bookingId}:`, error);
          // Fall back to manual update
          updatedBooking = await storage.updateBookingStatus(bookingId, status);
        }
      } else {
        // For other status changes, just use the regular update
        updatedBooking = await storage.updateBookingStatus(bookingId, status);
      }
      
      // If booking is confirmed, schedule reminder notifications
      if (status === 'confirmed') {
        try {
          // Import here to avoid circular dependencies
          const { scheduleReminderEmails } = require('./notifications');
          await scheduleReminderEmails(bookingId);
          console.log(`Scheduled reminders for booking ${bookingId}`);
        } catch (reminderError) {
          console.error('Error scheduling reminders:', reminderError);
          // Don't fail the request just because reminder scheduling failed
        }
      }
      
      // Trigger notifications
      try {
        const { notifyBookingStatusChange } = require('./notifications');
        await notifyBookingStatusChange(bookingId, status);
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the request just because notification failed
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ message: 'Error updating booking status' });
    }
  });

  // Review routes
  app.get('/api/reviews/target/:targetId/:targetType', async (req, res) => {
    try {
      const targetId = parseInt(req.params.targetId);
      const targetType = req.params.targetType;
      
      if (!['host', 'guest', 'club'].includes(targetType)) {
        return res.status(400).json({ message: 'Invalid target type' });
      }
      
      const reviews = await storage.getReviewsByTargetId(targetId, targetType);
      
      // Get reviewer details
      const detailedReviews = await Promise.all(
        reviews.map(async (review) => {
          const reviewer = await storage.getUser(review.reviewerId);
          return {
            ...review,
            reviewer: reviewer ? { 
              id: reviewer.id, 
              username: reviewer.username,
              firstName: reviewer.firstName,
              lastName: reviewer.lastName,
              profileImage: reviewer.profileImage,
            } : undefined,
          };
        })
      );
      
      res.json(detailedReviews);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching reviews' });
    }
  });
  
  app.post('/api/reviews', isAuthenticated, async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      
      // Check if the user is creating a review themselves
      if ((req.user as any).id !== reviewData.reviewerId) {
        return res.status(403).json({ message: 'You can only create reviews as yourself' });
      }
      
      // Check if booking exists and is completed if a booking ID is provided
      if (reviewData.bookingId) {
        const booking = await storage.getBooking(reviewData.bookingId);
        if (!booking) {
          return res.status(404).json({ message: 'Booking not found' });
        }
        
        if (booking.status !== 'completed') {
          return res.status(400).json({ message: 'You can only review completed bookings' });
        }
        
        // Verify user was part of this booking
        const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
        if ((req.user as any).id !== booking.guestId && (req.user as any).id !== teeTime?.hostId) {
          return res.status(403).json({ message: 'You must be part of the booking to leave a review' });
        }
      }
      
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', details: error.errors });
      }
      res.status(500).json({ message: 'Error creating review' });
    }
  });

  // Message routes
  app.get('/api/messages/booking/:bookingId', isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      
      // Check if booking exists
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Check if user is part of the booking
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if ((req.user as any).id !== booking.guestId && (req.user as any).id !== teeTime?.hostId) {
        return res.status(403).json({ message: 'You must be part of the booking to view messages' });
      }
      
      const messages = await storage.getMessagesByBookingId(bookingId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching messages' });
    }
  });
  
  app.get('/api/messages/conversation/:otherUserId', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const otherUserId = parseInt(req.params.otherUserId);
      
      // Check if the other user exists
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const messages = await storage.getConversation(userId, otherUserId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Error fetching conversation' });
    }
  });
  
  // API endpoint to get all conversations for the authenticated user
  app.get('/api/conversations', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Get all messages sent or received by this user
      const allMessages = await storage.getUserMessages(userId);
      
      // Get unique conversation partners
      const conversationPartners = new Set<number>();
      allMessages.forEach(message => {
        if (message.senderId === userId) {
          conversationPartners.add(message.receiverId);
        } else {
          conversationPartners.add(message.senderId);
        }
      });
      
      // Build conversation summaries
      const conversations = await Promise.all(
        Array.from(conversationPartners).map(async (partnerId) => {
          const partner = await storage.getUser(partnerId);
          if (!partner) return null;
          
          // Get the last message in this conversation
          const conversationMessages = allMessages.filter(
            msg => (msg.senderId === userId && msg.receiverId === partnerId) || 
                  (msg.senderId === partnerId && msg.receiverId === userId)
          ).sort((a, b) => 
            (b.createdAt ? new Date(b.createdAt).getTime() : 0) - 
            (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          );
          
          const lastMessage = conversationMessages[0];
          
          // Count unread messages
          const unreadCount = conversationMessages.filter(
            msg => msg.receiverId === userId && !msg.isRead
          ).length;
          
          return {
            id: partnerId,
            otherUser: {
              id: partner.id,
              name: partner.firstName && partner.lastName 
                ? `${partner.firstName} ${partner.lastName}`
                : partner.username,
              profileImage: partner.profileImage,
              lastMessage: lastMessage?.content || '',
              lastMessageTime: lastMessage?.createdAt || new Date().toISOString(),
              unreadCount,
              isOnline: connections.has(partnerId)
            }
          };
        })
      );
      
      // Filter out null values and sort by last message time
      const validConversations = conversations
        .filter(Boolean)
        .sort((a, b) => 
          new Date(b!.otherUser.lastMessageTime).getTime() - 
          new Date(a!.otherUser.lastMessageTime).getTime()
        );
      
      res.json(validConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Error fetching conversations' });
    }
  });
  
  app.post('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      
      // Check if the user is sending a message as themselves
      if ((req.user as any).id !== messageData.senderId) {
        return res.status(403).json({ message: 'You can only send messages as yourself' });
      }
      
      // If booking ID is provided, verify user is part of the booking
      if (messageData.bookingId) {
        const booking = await storage.getBooking(messageData.bookingId);
        if (!booking) {
          return res.status(404).json({ message: 'Booking not found' });
        }
        
        const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
        if ((req.user as any).id !== booking.guestId && (req.user as any).id !== teeTime?.hostId) {
          return res.status(403).json({ message: 'You must be part of the booking to send messages' });
        }
      }
      
      const message = await storage.createMessage(messageData);
      
      // Send message to recipient via WebSocket if they're connected
      const recipientSocket = connections.get(messageData.receiverId);
      if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
        recipientSocket.send(JSON.stringify({
          type: 'message',
          data: message,
        }));
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', details: error.errors });
      }
      res.status(500).json({ message: 'Error sending message' });
    }
  });
  
  app.put('/api/messages/:id/read', isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      
      // Check if message exists
      const message = await storage.getMessage(messageId);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
      
      // Only the recipient can mark a message as read
      if ((req.user as any).id !== message.receiverId) {
        return res.status(403).json({ message: 'Only the recipient can mark a message as read' });
      }
      
      const updatedMessage = await storage.markMessageAsRead(messageId);
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ message: 'Error marking message as read' });
    }
  });

  // Stripe payment routes
  // New endpoint - creates payment intent without requiring a booking first
  app.post('/api/create-direct-payment-intent', isAuthenticated, async (req, res) => {
    try {
      const { amount, teeTimeId, metadata } = req.body;
      
      console.log('Creating direct payment intent:', { amount, teeTimeId });
      
      if (!amount || !teeTimeId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Get tee time details to validate
      const teeTime = await storage.getTeeTimeListing(teeTimeId);
      if (!teeTime) {
        console.error('Tee time not found:', teeTimeId);
        return res.status(404).json({ message: 'Tee time not found' });
      }
      
      // Check if tee time is available
      if (teeTime.status !== 'available') {
        return res.status(400).json({ message: 'This tee time is no longer available' });
      }
      
      // Get club info for the description
      const club = await storage.getClub(teeTime.clubId);
      const clubName = club ? club.name : 'Golf Club';
      const formattedDate = new Date(teeTime.date).toLocaleDateString();
      
      // Create payment intent with ONLY card payment method
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        payment_method_types: ['card'], // Restrict to cards only
        payment_method_options: {
          card: {
            // Ensure only card payments are allowed
            request_three_d_secure: 'automatic'
          }
        },
        // Disallow any automatic payment method selection
        automatic_payment_methods: { enabled: false },
        metadata: {
          teeTimeId: teeTimeId.toString(),
          guestId: (req.user as any).id.toString(),
          ...metadata
        },
        description: `Tee time booking at ${clubName} for ${formattedDate}`,
      });
      
      console.log('Direct payment intent created:', paymentIntent.id);
      
      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error('Error creating direct payment intent:', error);
      res.status(500).json({ message: 'Error creating payment intent' });
    }
  });

  // Manual booking confirmation endpoint - for emergency booking fixes when payment succeeds but confirmation fails
  app.post('/api/bookings/:bookingId/confirm-manual', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const bookingId = parseInt(req.params.bookingId);
      
      console.log(`[MANUAL CONFIRM] Starting manual confirmation for booking ${bookingId}`);
      
      // Get the booking to make sure it belongs to the user
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        console.log(`[MANUAL CONFIRM] Booking ${bookingId} not found`);
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      if (booking.guestId !== (req.user as any).id) {
        console.log(`[MANUAL CONFIRM] User ${(req.user as any).id} is not authorized to confirm booking ${bookingId} (belongs to user ${booking.guestId})`);
        return res.status(403).json({ message: 'Forbidden - You are not authorized to confirm this booking' });
      }
      
      // If booking is already confirmed, just return it
      if (booking.status === 'confirmed') {
        console.log(`[MANUAL CONFIRM] Booking ${bookingId} is already confirmed, returning existing booking`);
        return res.status(200).json({ 
          status: 'success', 
          message: 'Booking is already confirmed',
          booking
        });
      }
      
      // Check tee time status
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (!teeTime) {
        console.error(`[MANUAL CONFIRM] Tee time ${booking.teeTimeId} not found for booking ${bookingId}`);
        return res.status(404).json({ message: 'Tee time for this booking not found' });
      }
      
      // Check if tee time is already booked by someone else
      if (teeTime.status === 'booked') {
        // Check if this booking was already confirmed but status mismatch occurred
        const existingBookings = await storage.getBookingsByTeeTimeId(booking.teeTimeId);
        const otherConfirmedBookings = existingBookings.filter(b => 
          b.id !== booking.id && b.status === 'confirmed'
        );
        
        if (otherConfirmedBookings.length > 0) {
          console.error(`[MANUAL CONFIRM] Tee time ${booking.teeTimeId} is already booked by another user`);
          await storage.updateBookingStatus(bookingId, 'cancelled');
          return res.status(409).json({ 
            message: 'This tee time has already been booked by someone else',
            status: 'cancelled' 
          });
        }
      }
      
      // Allow a wider range of confirmable states for manual confirmation
      const confirmableStates = ['pending', 'payment_pending', 'payment_processing'];
      if (!confirmableStates.includes(booking.status)) {
        console.error(`[MANUAL CONFIRM] Booking ${bookingId} is in ${booking.status} state, not confirmable`);
        return res.status(400).json({ 
          message: `Cannot confirm booking in ${booking.status} state` 
        });
      }
      
      console.log(`[MANUAL CONFIRM] Attempting to confirm booking ${bookingId} for user ${(req.user as any).id}`);
      let confirmedBooking;
      let paymentStatus = 'none';
      
      // If the booking has a payment intent ID, check its status with Stripe first
      if (booking.stripePaymentIntentId) {
        try {
          console.log(`[MANUAL CONFIRM] Checking payment intent ${booking.stripePaymentIntentId} status with Stripe`);
          
          const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
          paymentStatus = paymentIntent.status;
          
          console.log(`[MANUAL CONFIRM] Payment intent ${booking.stripePaymentIntentId} has status: ${paymentStatus}`);
          
          // If payment is successful or can be captured, proceed with confirmation
          if (paymentStatus === 'succeeded' || 
              paymentStatus === 'requires_capture' || 
              paymentStatus === 'processing') {
            
            console.log(`[MANUAL CONFIRM] Payment is in a successful state (${paymentStatus}), confirming booking`);
            
            try {
              confirmedBooking = await bookingService.confirmBooking(bookingId, booking.stripePaymentIntentId);
              console.log(`[MANUAL CONFIRM] Successfully confirmed booking ${bookingId} through booking service`);
            } catch (confirmError) {
              console.error(`[MANUAL CONFIRM] Error confirming through booking service:`, confirmError);
              // Fall back to manual update if booking service fails
              confirmedBooking = await storage.updateBookingStatus(bookingId, 'confirmed');
              
              // Also update the tee time to booked status
              if (booking.teeTimeId) {
                await storage.updateTeeTimeListing(booking.teeTimeId, { status: 'booked' });
              }
              
              console.log(`[MANUAL CONFIRM] Manually updated booking ${bookingId} status to confirmed`);
            }
          } 
          // If payment requires confirmation, try to confirm it first
          else if (paymentStatus === 'requires_confirmation') {
            console.log(`[MANUAL CONFIRM] Payment requires confirmation, attempting to confirm with Stripe`);
            
            try {
              const confirmedIntent = await stripe.paymentIntents.confirm(booking.stripePaymentIntentId);
              console.log(`[MANUAL CONFIRM] Payment confirmation result: ${confirmedIntent.status}`);
              
              // If confirmation was successful, proceed with booking confirmation
              if (confirmedIntent.status === 'succeeded' || 
                  confirmedIntent.status === 'requires_capture' || 
                  confirmedIntent.status === 'processing') {
                
                confirmedBooking = await bookingService.confirmBooking(bookingId, booking.stripePaymentIntentId);
                console.log(`[MANUAL CONFIRM] Successfully confirmed booking ${bookingId} after payment confirmation`);
              } else {
                console.log(`[MANUAL CONFIRM] Payment confirmation did not result in success: ${confirmedIntent.status}`);
              }
            } catch (confirmError) {
              console.error(`[MANUAL CONFIRM] Error confirming payment with Stripe:`, confirmError);
            }
          }
          // For other payment states, we'll fall back to manual confirmation below
        } catch (stripeError) {
          console.error(`[MANUAL CONFIRM] Error checking payment status with Stripe:`, stripeError);
        }
      }
      
      // If we haven't confirmed the booking yet (due to no payment ID or payment not in correct state),
      // perform a manual confirmation
      if (!confirmedBooking) {
        console.log(`[MANUAL CONFIRM] No confirmedBooking yet, proceeding with manual confirmation`);
        
        // Generate a mock payment ID if none exists
        const paymentId = booking.stripePaymentIntentId || `manual_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        
        try {
          // Try to use booking service first
          confirmedBooking = await bookingService.confirmBooking(bookingId, paymentId);
          console.log(`[MANUAL CONFIRM] Successfully confirmed booking ${bookingId} with payment ID ${paymentId}`);
        } catch (bookingServiceError) {
          console.error(`[MANUAL CONFIRM] Booking service error:`, bookingServiceError);
          
          // Direct update as fallback
          confirmedBooking = await storage.updateBookingStatus(bookingId, 'confirmed');
          
          // Also update the tee time to booked status
          if (booking.teeTimeId) {
            await storage.updateTeeTimeListing(booking.teeTimeId, { status: 'booked' });
          }
          
          console.log(`[MANUAL CONFIRM] Directly updated booking status for ${bookingId} to confirmed`);
        }
      }
      
      // Send confirmation notification
      try {
        const notificationsModule = await import('./notifications');
        if (notificationsModule.notifyBookingStatusChange) {
          await notificationsModule.notifyBookingStatusChange(bookingId, 'confirmed');
          console.log(`[MANUAL CONFIRM] Sent booking confirmation notification for ${bookingId}`);
        }
      } catch (notifyError) {
        console.error(`[MANUAL CONFIRM] Error sending notification:`, notifyError);
      }
      
      console.log(`[MANUAL CONFIRM] Manual confirmation completed successfully for booking ${bookingId}`);
      
      // Return detailed response
      res.status(200).json({
        status: 'success',
        message: 'Booking confirmed successfully',
        booking: confirmedBooking,
        paymentStatus: paymentStatus,
        manualConfirmation: true
      });
    } catch (error: any) {
      console.error('[MANUAL CONFIRM] Error in manual confirmation process:', error);
      res.status(500).json({ 
        status: 'error',
        message: error.message || 'Failed to confirm booking',
        error: error.stack || 'No stack trace available'
      });
    }
  });

  app.post('/api/create-payment-intent', isAuthenticated, async (req, res) => {
    try {
      const { bookingId } = req.body;
      
      console.log('Creating payment intent for booking:', bookingId);
      
      // Get booking details
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        console.error('Booking not found:', bookingId);
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      console.log('Booking found:', JSON.stringify(booking));
      
      // Ensure user is the one making the booking
      if ((req.user as any).id !== booking.guestId) {
        console.error('User is not the guest:', (req.user as any).id, 'vs', booking.guestId);
        return res.status(403).json({ message: 'You can only pay for your own bookings' });
      }
      
      // Get tee time details
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (!teeTime) {
        console.error('Tee time not found:', booking.teeTimeId);
        return res.status(404).json({ message: 'Tee time not found' });
      }
      
      console.log('Tee time found:', JSON.stringify(teeTime));
      
      // Calculate amount (ensure we have a valid number)
      const totalPrice = booking.totalPrice || teeTime.price || 100; // Fallback to tee time price or 100
      const amount = Math.round(totalPrice * 100); // convert to cents
      
      console.log('Payment amount:', amount, 'cents');
      
      // Check if Stripe API key is properly configured
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === '') {
        console.log('NOTICE: Using mock payment flow since Stripe API key is not configured');
        
        // Generate a fake client secret for testing
        const mockClientSecret = `mock_pi_${Date.now()}_secret_${Math.random().toString(36).substring(2, 15)}`;
        const mockPaymentIntentId = `mock_pi_${Date.now()}`;
        
        // Update booking with payment intent ID but don't confirm yet
        await storage.updateBooking(booking.id, { 
          stripePaymentIntentId: mockPaymentIntentId,
          status: 'payment_pending'  
        });
        
        // Don't update tee time status until mock payment is "confirmed"
        // (this will happen when user returns to the site after payment)
        
        // Return mock client secret
        return res.json({ clientSecret: mockClientSecret, isMock: true });
      }
      
      // If we reach here, we have a valid API key
      // Create a real payment intent
      console.log('Creating Stripe payment intent with real API key');
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'], // Restrict to cards only
        payment_method_options: {
          card: {
            // Ensure only card payments are allowed
            request_three_d_secure: 'automatic'
          }
        },
        // Disallow any automatic payment method selection
        automatic_payment_methods: { enabled: false },
        metadata: {
          bookingId: booking.id.toString(),
          teeTimeId: teeTime.id.toString(),
          guestId: booking.guestId.toString(),
          hostId: teeTime.hostId.toString(),
          directPayment: 'true'
        },
      });
      
      console.log('Payment intent created successfully:', paymentIntent.id);
      
      // Update booking with payment intent ID
      await storage.updateBooking(booking.id, { 
        stripePaymentIntentId: paymentIntent.id,
        status: 'payment_pending'  
      });
      
      return res.json({ clientSecret: paymentIntent.client_secret });
      
    } catch (error: any) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });
  
  app.post('/api/capture-payment', isAuthenticated, async (req, res) => {
    try {
      const { bookingId } = req.body;
      
      // Get booking details
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Get tee time details
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      if (!teeTime) {
        return res.status(404).json({ message: 'Tee time not found' });
      }
      
      // Ensure user is the host
      if ((req.user as any).id !== teeTime.hostId) {
        return res.status(403).json({ message: 'Only the host can capture the payment' });
      }
      
      // Check if payment intent exists
      if (!booking.stripePaymentIntentId) {
        return res.status(400).json({ message: 'No payment intent associated with this booking' });
      }
      
      // Check if booking is completed and 24 hours have passed
      if (booking.status !== 'completed' || !booking.completedAt) {
        return res.status(400).json({ message: 'Booking must be completed before capturing payment' });
      }
      
      const hoursSinceCompletion = (Date.now() - booking.completedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCompletion < 24) {
        return res.status(400).json({ 
          message: 'Payment will be captured automatically 24 hours after completion',
          hoursRemaining: 24 - hoursSinceCompletion
        });
      }
      
      // Capture payment
      const paymentIntent = await stripe.paymentIntents.capture(booking.stripePaymentIntentId);
      
      // Notify host of payment
      try {
        // Import here to avoid circular dependencies
        const { notifyHostPayment } = require('./notifications');
        const amount = booking.totalPrice;
        await notifyHostPayment(booking.id, amount);
        console.log(`Sent payment notification for booking ${booking.id}`);
      } catch (notificationError) {
        console.error('Error sending payment notification:', notificationError);
        // Don't fail the request just because notification failed
      }
      
      res.json({ success: true, paymentIntent });
    } catch (error: any) {
      res.status(500).json({ message: 'Error capturing payment: ' + error.message });
    }
  });
  
  // Account for Stripe Connect
  app.post('/api/create-connect-account', isAuthenticated, isHost, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.stripeConnectId) {
        return res.status(400).json({ message: 'You already have a connected account' });
      }
      
      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email || undefined,
        metadata: {
          userId: user.id.toString(),
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      
      // Update user with connect account ID
      await storage.updateUserStripeInfo(userId, { 
        customerId: user.stripeCustomerId || 'pending',
        connectId: account.id
      });
      
      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${req.headers.origin}/dashboard`,
        return_url: `${req.headers.origin}/dashboard`,
        type: 'account_onboarding',
      });
      
      res.json({ accountLink: accountLink.url });
    } catch (error: any) {
      res.status(500).json({ message: 'Error creating connect account: ' + error.message });
    }
  });

  // Notifications routes
  app.use('/api/notifications', notificationsRoutes);

  // Stripe webhook handler for automated payment processing
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    console.log('[STRIPE WEBHOOK] ===== Received at', new Date().toISOString(), '=====');
    
    // Return a 200 response immediately to acknowledge receipt
    // This prevents Stripe from retrying the webhook due to long processing time
    // We'll process the event asynchronously
    const sendAcknowledgment = () => {
      res.status(200).json({ received: true });
    };
    
    try {
      // Log headers for debugging without revealing secrets
      const headers = { ...req.headers };
      if (headers['stripe-signature']) {
        headers['stripe-signature'] = 'PRESENT (redacted)';
      }
      console.log('[STRIPE WEBHOOK] Headers:', JSON.stringify(headers));
      
      const signature = req.headers['stripe-signature'] as string;
      
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn('STRIPE_WEBHOOK_SECRET is not set, webhook events cannot be verified');
        sendAcknowledgment();
        return;
      }
      
      if (!signature) {
        console.error('Missing stripe-signature header in webhook request');
        sendAcknowledgment();
        return;
      }
      
      // Log body type and size for debugging
      console.log('Webhook body type:', typeof req.body);
      console.log('Webhook body is Buffer?', Buffer.isBuffer(req.body));
      console.log('Webhook body size:', req.body ? (Buffer.isBuffer(req.body) ? req.body.length : JSON.stringify(req.body).length) : 0);
      
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('Webhook signature verified successfully!');
        
        // Send acknowledgment immediately after verification
        sendAcknowledgment();
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        console.error('Webhook verification error details:', err);
        sendAcknowledgment(); // Still send 200 to prevent retries
        return;
      }
      
      // Handle specific events
      console.log(`[STRIPE WEBHOOK] Processing event: ${event.type} with ID: ${(event as any).id || 'unknown_id'}`);
      
      // Implement idempotency check using the global set
      // In production, you'd want to store this in the database for persistence across restarts
      const eventId = (event as any).id || 'unknown_id';
      if (processedEvents.has(eventId)) {
        console.log(`[STRIPE WEBHOOK] Event ${eventId} already processed, skipping`);
        return; // Response already sent via sendAcknowledgment
      }
      
      // Mark this event as processed
      processedEvents.add(eventId);
      
      // Extract metadata from payment intent
      let bookingId: number | undefined = undefined;
      let teeTimeId: number | undefined = undefined;
      let guestId: number | undefined = undefined;
      let numberOfPlayers: number | undefined = undefined;
      let booking: any = undefined;
      let teeTime: any = undefined;
      let host: any = undefined;
      let guest: any = undefined;
      let notificationsModule: any = undefined;
      const eventObject = event.data.object as any; // Cast to any to handle different event types
      
      if (eventObject) {
        // First check if we can find bookings directly by payment intent ID
        if (eventObject.id) {
          try {
            const bookingsWithIntent = await storage.getBookingsByPaymentIntent(eventObject.id);
            
            if (bookingsWithIntent && bookingsWithIntent.length > 0) {
              // Use the first matching booking (typically there should be only one)
              booking = bookingsWithIntent[0];
              bookingId = booking.id;
              console.log(`[STRIPE WEBHOOK] Found booking ${bookingId} by payment intent ${eventObject.id}`);
              
              // Load related data
              if (booking) {
                teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
                if (teeTime) {
                  host = await storage.getUser(teeTime.hostId);
                  guest = await storage.getUser(booking.guestId);
                }
              }
            }
          } catch (lookupError) {
            console.error(`[STRIPE WEBHOOK] Error looking up bookings by payment intent:`, lookupError);
          }
        }
        
        // If we didn't find a booking by payment intent, check metadata
        if (!booking && eventObject.metadata) {
          // Check if this is from an existing booking
          if (eventObject.metadata.bookingId) {
            bookingId = parseInt(eventObject.metadata.bookingId);
            if (!isNaN(bookingId)) {
              booking = await storage.getBooking(bookingId);
              
              if (booking) {
                console.log(`[STRIPE WEBHOOK] Found booking ${bookingId} from metadata`);
                teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
                if (teeTime) {
                  host = await storage.getUser(teeTime.hostId);
                  guest = await storage.getUser(booking.guestId);
                }
              }
            }
          }
        } 
        // Check if this is from a direct payment (new flow)
        else if (eventObject.metadata.teeTimeId && eventObject.metadata.guestId) {
          teeTimeId = parseInt(eventObject.metadata.teeTimeId);
          guestId = parseInt(eventObject.metadata.guestId);
          numberOfPlayers = parseInt(eventObject.metadata.numberOfPlayers || '1');
          
          if (!isNaN(teeTimeId) && !isNaN(guestId)) {
            teeTime = await storage.getTeeTimeListing(teeTimeId);
            if (teeTime) {
              host = await storage.getUser(teeTime.hostId);
              guest = await storage.getUser(guestId);
              
              // Fetch the club data to have complete information
              if (teeTime.clubId) {
                teeTime.club = await storage.getClub(teeTime.clubId);
              }
            }
          }
        }
      }
      
      switch(event.type) {
        case 'payment_intent.created':
          // A payment intent was created, log it but don't take action yet
          console.log(`PaymentIntent ${eventObject.id || 'unknown'} created for booking ${bookingId || 'unknown'}`);
          break;
          
        case 'payment_intent.succeeded':
          // Payment succeeded
          console.log(`PaymentIntent ${eventObject.id || 'unknown'} succeeded (Webhook event)`);
          
          // Verify payment intent status before proceeding
          if (eventObject.status !== 'succeeded') {
            console.error(`PaymentIntent ${eventObject.id} webhook shows succeeded event but intent status is ${eventObject.status}. Skipping confirmation.`);
            return; // We already sent acknowledgment
          }
          
          // Ensure we have metadata from the payment intent
          if (!eventObject.metadata || (!eventObject.metadata.bookingId && !eventObject.metadata.teeTimeId)) {
            console.error(`PaymentIntent ${eventObject.id} has no valid metadata. Cannot link to booking.`);
            return; // We already sent acknowledgment
          }
          
          // Case 1: We have an existing booking (legacy flow)
          if (booking && bookingId && booking.status !== 'confirmed') {
            try {
              console.log(`Attempting to confirm booking ${bookingId} with payment ${eventObject.id}`);
              // Use booking service to confirm the booking
              // This handles updating both the booking status and tee time status
              await bookingService.confirmBooking(bookingId, eventObject.id || '');
              console.log(`Booking ${bookingId} confirmed through booking service`);
            } catch (error) {
              console.error(`Error confirming booking ${bookingId}:`, error);
              // Fall back to manual updates if booking service fails
              await storage.updateBookingStatus(bookingId, 'confirmed');
              
              // Update tee time status to booked if teeTime exists
              if (teeTime) {
                console.log(`Marking tee time ${teeTime.id} as booked due to successful payment for booking ${bookingId}`);
                await storage.updateTeeTimeListing(teeTime.id, { status: 'booked' });
              }
            }
          } 
          // Case 2: We have a direct payment without a booking yet (new flow)
          else if (teeTime && teeTimeId && guestId && numberOfPlayers) {
            console.log(`Processing direct payment for tee time ${teeTimeId} by user ${guestId} (Webhook event)`);
            
            // Verify tee time is still available
            if (teeTime.status !== 'available') {
              console.error(`Tee time ${teeTimeId} is no longer available (status: ${teeTime.status})`);
              return res.json({
                received: true,
                status: 'tee_time_unavailable',
                message: `Tee time ${teeTimeId} is no longer available`
              });
            }
            
            try {
              // Calculate total price based on tee time price and number of players
              const totalPrice = teeTime.price * numberOfPlayers;
              
              // Create booking record using validated schema
              const bookingData = {
                teeTimeId,
                guestId,
                numberOfPlayers,
                totalPrice,
                status: 'confirmed', // Directly create as confirmed since payment succeeded
                stripePaymentIntentId: eventObject.id || '',
                createdAt: new Date().toISOString(),
                completedAt: null
              };
              
              // Create the booking with comprehensive error handling
              const newBooking = await storage.createBooking(bookingData);
              
              if (!newBooking || !newBooking.id) {
                console.error('Booking creation failed - no valid booking returned');
                return res.json({ 
                  received: true, 
                  status: 'booking_creation_failed', 
                  message: 'Failed to create booking record' 
                });
              }
              
              console.log(`New booking ${newBooking.id} created from direct payment`);
              
              try {
                // Update tee time status to booked
                await storage.updateTeeTimeListing(teeTimeId, { status: 'booked' });
                console.log(`Tee time ${teeTimeId} marked as booked`);
              } catch (teeTimeError) {
                console.error(`Failed to update tee time status to booked:`, teeTimeError);
                // Continue with the booking since payment was successful
                // We don't want to roll back the booking at this point
              }
              
              // Update bookingId for notifications
              bookingId = newBooking.id;
              booking = newBooking;
            } catch (error) {
              console.error(`Error creating booking from direct payment:`, error);
              return res.json({ 
                received: true, 
                status: 'booking_creation_error', 
                message: `Error during booking creation: ${error instanceof Error ? error.message : 'Unknown error'}` 
              });
            }
          }
          
          // Send confirmation notifications
          if (booking && bookingId) {
            try {
              // Load notifications module and send confirmation notification
              notificationsModule = await import('./notifications');
              if (notificationsModule.notifyBookingStatusChange) {
                console.log(`Sending confirmation notification for booking ${bookingId}`);
                await notificationsModule.notifyBookingStatusChange(bookingId, 'confirmed');
                console.log(`Confirmation notification sent successfully for booking ${bookingId}`);
              } else {
                console.warn(`Notification module loaded but notifyBookingStatusChange function not found`);
              }
            } catch (notifyError) {
              // Non-critical error, log but continue
              console.error(`Error sending confirmation notification for booking ${bookingId}:`, notifyError);
              // Don't return an error response here as the booking is already successfully created
              // This is a non-critical background task
            }
          } else {
            console.warn(`No valid booking found for sending confirmation notification`);
          }
          break;
          
        case 'payment_intent.payment_failed':
          // Payment failed (card declined, etc.)
          console.log(`PaymentIntent ${eventObject.id || 'unknown'} failed for booking ${bookingId || 'unknown'}`);
          
          // Extract failure reason if available
          const failureMessage = eventObject.last_payment_error ? 
            eventObject.last_payment_error.message : 'Unknown payment failure reason';
          console.log(`Payment failure reason: ${failureMessage}`);
          
          if (booking && bookingId) {
            try {
              // Update booking status to payment_failed
              await storage.updateBookingStatus(bookingId, 'payment_failed');
              console.log(`Updated booking ${bookingId} status to payment_failed`);
              
              // Restore tee time back to available if it exists
              if (teeTime) {
                try {
                  console.log(`Restoring tee time ${teeTime.id} to available status due to failed payment for booking ${bookingId}`);
                  await storage.updateTeeTimeListing(teeTime.id, { status: 'available' });
                  console.log(`Successfully restored tee time ${teeTime.id} to available status`);
                } catch (teeTimeError) {
                  console.error(`Failed to restore tee time status to available:`, teeTimeError);
                  // Continue despite this error
                }
              }
              
              // Send notification about payment failure
              try {
                notificationsModule = await import('./notifications');
                if (notificationsModule.notifyBookingStatusChange) {
                  console.log(`Sending payment_failed notification for booking ${bookingId}`);
                  await notificationsModule.notifyBookingStatusChange(bookingId, 'payment_failed');
                }
              } catch (notifyError) {
                console.error('Error sending payment failed notification:', notifyError);
                // Non-critical error, continue
              }
            } catch (statusError) {
              console.error(`Failed to update booking status to payment_failed:`, statusError);
              // We should still acknowledge receipt of the webhook event
            }
          } else {
            console.warn(`No valid booking found for payment_failed event`);
          }
          break;
          
        case 'payment_intent.canceled':
          // Payment was canceled
          console.log(`PaymentIntent ${eventObject.id || 'unknown'} canceled for booking ${bookingId || 'unknown'}`);
          
          // Extract cancellation reason if available
          const cancellationReason = eventObject.cancellation_reason || 'Unknown cancellation reason';
          console.log(`Payment cancellation reason: ${cancellationReason}`);
          
          if (booking && bookingId) {
            try {
              console.log(`Attempting to cancel booking ${bookingId} through booking service`);
              // Use booking service to cancel the booking
              // This handles updating both the booking status and tee time status
              await bookingService.cancelBooking(bookingId, `Payment intent canceled: ${eventObject.id} (${cancellationReason})`);
              console.log(`Booking ${bookingId} cancelled successfully through booking service`);
            } catch (error) {
              console.error(`Error using booking service to cancel booking ${bookingId}:`, error);
              
              // Fall back to manual updates if booking service fails
              try {
                console.log(`Attempting manual cancellation for booking ${bookingId}`);
                await storage.updateBookingStatus(bookingId, 'canceled');
                console.log(`Booking ${bookingId} manually marked as canceled`);
                
                // Also manually update tee time status if needed
                if (teeTime && teeTimeId) {
                  console.log(`Restoring tee time ${teeTimeId} to available status manually`);
                  await storage.updateTeeTimeListing(teeTimeId, { status: 'available' });
                  console.log(`Tee time ${teeTimeId} status successfully restored to available`);
                }
              } catch (manualError) {
                console.error(`Manual cancellation also failed for booking ${bookingId}:`, manualError);
                // At this point we've tried everything, just continue to acknowledge the webhook
              }
            }
            
            // Send notification about cancellation - separate try/catch block
            try {
              console.log(`Sending cancellation notification for booking ${bookingId}`);
              notificationsModule = await import('./notifications');
              if (notificationsModule.notifyBookingStatusChange) {
                await notificationsModule.notifyBookingStatusChange(bookingId, 'canceled');
                console.log(`Cancellation notification sent successfully for booking ${bookingId}`);
              } else {
                console.warn(`Notification module loaded but notifyBookingStatusChange function not found`);
              }
            } catch (notifyError) {
              console.error(`Error sending cancellation notification for booking ${bookingId}:`, notifyError);
              // Non-critical error, continue
            }
          } else {
            console.warn(`No valid booking found for payment_intent.canceled event`);
          }
          break;
          
        case 'charge.captured':
          // Funds have been captured (after the 24-hour escrow period)
          const paymentIntentId = eventObject.payment_intent ? String(eventObject.payment_intent) : 'unknown';
          console.log(`Charge captured for PaymentIntent ${paymentIntentId} and booking ${bookingId || 'unknown'}`);
          
          // Additional charge details for clarity
          const chargeAmount = eventObject.amount ? 
            `$${(eventObject.amount / 100).toFixed(2)}` : 'unknown amount';
          console.log(`Charge details: ${chargeAmount} (${eventObject.currency || 'unknown currency'})`);
          
          if (booking && host && bookingId) {
            try {
              // Update booking status to reflect payment completed to host
              console.log(`Updating booking ${bookingId} status to indicate payment completed to host`);
              await storage.updateBookingStatus(bookingId, 'payment_completed_to_host');
              console.log(`Booking ${bookingId} status updated to payment_completed_to_host`);
            } catch (statusError) {
              console.error(`Error updating booking status for payment completion:`, statusError);
              // Continue despite this error to try notification
            }
            
            // This is when the host actually receives the payment - send notification
            try {
              console.log(`Sending host payment notification for booking ${bookingId}`);
              notificationsModule = await import('./notifications');
              
              // Check if the specialized host payment notification function exists
              if (notificationsModule.notifyHostPayment && booking) {
                console.log(`Using specialized host payment notification for booking ${bookingId}`);
                await notificationsModule.notifyHostPayment(bookingId, booking.totalPrice);
                console.log(`Host payment notification sent successfully for booking ${bookingId}`);
              } else if (notificationsModule.notifyBookingStatusChange) {
                // Fallback to generic status change notification
                console.log(`Using generic payment notification for booking ${bookingId}`);
                await notificationsModule.notifyBookingStatusChange(bookingId, 'payment_completed');
                console.log(`Generic payment notification sent successfully for booking ${bookingId}`);
              } else {
                console.warn(`Notification module loaded but no suitable notification function found`);
              }
            } catch (notifyError) {
              console.error(`Error sending host payment notification for booking ${bookingId}:`, notifyError);
              // Non-critical error, continue
            }
          } else {
            console.warn(`Missing required data for charge.captured event: booking=${!!booking}, host=${!!host}, bookingId=${bookingId}`);
          }
          break;
          
        case 'charge.refunded':
          // Payment was refunded
          const refundPaymentId = eventObject.payment_intent ? String(eventObject.payment_intent) : 'unknown';
          console.log(`Charge refunded for PaymentIntent ${refundPaymentId} and booking ${bookingId || 'unknown'}`);
          
          // Extract refund reason if available
          const refundReason = eventObject.refunds?.data?.[0]?.reason || 'Unknown refund reason';
          console.log(`Refund reason: ${refundReason}`);
          
          if (booking && bookingId) {
            try {
              console.log(`Updating booking ${bookingId} status to refunded`);
              await storage.updateBookingStatus(bookingId, 'refunded');
              console.log(`Booking ${bookingId} successfully marked as refunded`);
            } catch (statusError) {
              console.error(`Error updating booking ${bookingId} status to refunded:`, statusError);
              // Continue despite this error to try notification
            }
            
            // Send notification in a separate try/catch block
            try {
              console.log(`Sending refund notification for booking ${bookingId}`);
              notificationsModule = await import('./notifications');
              if (notificationsModule.notifyBookingStatusChange) {
                await notificationsModule.notifyBookingStatusChange(bookingId, 'refunded');
                console.log(`Refund notification sent successfully for booking ${bookingId}`);
              } else {
                console.warn(`Notification module loaded but notifyBookingStatusChange function not found`);
              }
            } catch (notifyError) {
              console.error(`Error sending refund notification for booking ${bookingId}:`, notifyError);
              // Non-critical error, continue
            }
          } else {
            console.warn(`No valid booking found for charge.refunded event`);
          }
          break;
          
        default:
          // Log but ignore other event types
          console.log(`Received unhandled Stripe event type: ${event.type}`);
      }
      
      // Send a more detailed successful response with debugging info
      const response = {
        received: true,
        event_type: event.type,
        event_id: (event as any).id || 'unknown_id',
        timestamp: new Date().toISOString(),
        message: 'Webhook event processed successfully',
        // Add metadata for debugging specific to each event type
        details: {}
      };
      
      // Add event-specific metadata for debugging
      const details: any = {};
      if (bookingId) details.bookingId = bookingId;
      if (teeTimeId) details.teeTimeId = teeTimeId;
      if (eventObject.id) details.objectId = eventObject.id;
      response.details = details;
      
      // Log response for debugging
      console.log(`[STRIPE WEBHOOK] Successful response for ${event.type}:`, response);
      console.log(`[STRIPE WEBHOOK] ===== Event processed successfully at ${new Date().toISOString()} =====`);
      
      res.json(response);
    } catch (error) {
      // More detailed error response
      console.error('Error processing webhook event:', error);
      
      let errorMessage = 'Error processing webhook event';
      if (error instanceof Error) {
        errorMessage = `Error processing webhook event: ${error.message}`;
        console.error(`Error stack: ${(error as Error).stack}`);
      }
      
      // Log Stripe event if available
      if (event) {
        const eventId = (event as any).id ? String((event as any).id) : 'unknown';
        const eventType = typeof event.type === 'string' ? event.type : 'unknown';
        console.error(`[STRIPE WEBHOOK] Failed event type: ${eventType}, ID: ${eventId}`);
      }
      
      console.error(`----- Webhook processing FAILED at ${new Date().toISOString()} -----`);
      
      res.status(500).json({
        received: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    let userId: number | null = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // When user authenticates, store connection
        if (data.type === 'auth' && data.userId) {
          userId = parseInt(data.userId);
          connections.set(userId, ws);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove connection when socket is closed
      if (userId !== null) {
        connections.delete(userId);
      }
    });
  });

  return httpServer;
}
