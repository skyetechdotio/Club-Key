const express = require('express');
const { isAuthenticated, isHost } = require('./firebase-auth');
const storage = require('./mongo-storage');
const { admin } = require('./firebase');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16'
});

/**
 * Register all API routes
 */
async function registerRoutes(app) {
  // Firebase auth routes
  const authRoutes = express.Router();
  
  // Get current user info
  authRoutes.get('/me', isAuthenticated, (req, res) => {
    res.json(req.user);
  });
  
  // Update Firebase user profile
  authRoutes.patch('/profile', isAuthenticated, async (req, res) => {
    try {
      const allowedFields = ['firstName', 'lastName', 'bio', 'profileImage', 'isHost'];
      const updateData = {};
      
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updateData[key] = req.body[key];
        }
      });
      
      const updatedUser = await storage.updateUser(req.user._id, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });
  
  app.use('/api/auth', authRoutes);
  
  // User routes
  const userRoutes = express.Router();
  
  userRoutes.get('/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return sensitive information
      delete user.stripeCustomerId;
      delete user.stripeConnectId;
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });
  
  app.use('/api/users', userRoutes);
  
  // Club routes
  const clubRoutes = express.Router();
  
  clubRoutes.get('/', async (req, res) => {
    try {
      const clubs = await storage.getClubs();
      res.json(clubs);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      res.status(500).json({ message: 'Failed to fetch clubs' });
    }
  });
  
  clubRoutes.get('/:id', async (req, res) => {
    try {
      const club = await storage.getClub(req.params.id);
      if (!club) {
        return res.status(404).json({ message: 'Club not found' });
      }
      res.json(club);
    } catch (error) {
      console.error('Error fetching club:', error);
      res.status(500).json({ message: 'Failed to fetch club' });
    }
  });
  
  clubRoutes.post('/', isAuthenticated, async (req, res) => {
    try {
      const club = await storage.createClub(req.body);
      res.status(201).json(club);
    } catch (error) {
      console.error('Error creating club:', error);
      res.status(500).json({ message: 'Failed to create club' });
    }
  });
  
  app.use('/api/clubs', clubRoutes);
  
  // User Club routes
  const userClubRoutes = express.Router();
  
  userClubRoutes.get('/:userId/clubs', async (req, res) => {
    try {
      const userClubs = await storage.getUserClubs(req.params.userId);
      
      // Get full club details for each club membership
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
      console.error('Error fetching user clubs:', error);
      res.status(500).json({ message: 'Failed to fetch user clubs' });
    }
  });
  
  userClubRoutes.post('/', isAuthenticated, async (req, res) => {
    try {
      // Ensure the user is adding themselves to a club
      if (req.user._id.toString() !== req.body.userId) {
        return res.status(403).json({ message: 'You can only add yourself to a club' });
      }
      
      const userClub = await storage.addUserToClub(req.body);
      res.status(201).json(userClub);
    } catch (error) {
      console.error('Error adding user to club:', error);
      res.status(500).json({ message: 'Failed to add user to club' });
    }
  });
  
  app.use('/api/user-clubs', userClubRoutes);
  
  // Tee Time Listing routes
  const teeTimeRoutes = express.Router();
  
  teeTimeRoutes.get('/', async (req, res) => {
    try {
      const { location, date, players } = req.query;
      const teeTimeListings = await storage.getAvailableTeeTimeListings();
      
      // Get detailed information for each listing
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
              _id: host._id,
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
      
      // Apply search relevance scoring based on query parameters
      if (location || date || players) {
        detailedListings = applySearchRelevanceScoring(detailedListings, {
          location,
          date,
          players: players ? parseInt(players) : undefined
        });
      }
      
      res.json(detailedListings);
    } catch (error) {
      console.error('Error fetching tee time listings:', error);
      res.status(500).json({ message: 'Failed to fetch tee time listings' });
    }
  });
  
  teeTimeRoutes.get('/:id', async (req, res) => {
    try {
      const teeTime = await storage.getTeeTimeListing(req.params.id);
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
          _id: host._id,
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
      console.error('Error fetching tee time listing:', error);
      res.status(500).json({ message: 'Failed to fetch tee time listing' });
    }
  });
  
  teeTimeRoutes.post('/', isAuthenticated, isHost, async (req, res) => {
    try {
      // Ensure the user is creating a tee time as themselves
      const teeTimeData = {
        ...req.body,
        hostId: req.user._id
      };
      
      const teeTime = await storage.createTeeTimeListing(teeTimeData);
      res.status(201).json(teeTime);
    } catch (error) {
      console.error('Error creating tee time listing:', error);
      res.status(500).json({ message: 'Failed to create tee time listing' });
    }
  });
  
  teeTimeRoutes.patch('/:id', isAuthenticated, isHost, async (req, res) => {
    try {
      const teeTime = await storage.getTeeTimeListing(req.params.id);
      
      // Ensure the user is updating their own tee time
      if (!teeTime || teeTime.hostId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only update your own tee time listings' });
      }
      
      const updatedTeeTime = await storage.updateTeeTimeListing(req.params.id, req.body);
      res.json(updatedTeeTime);
    } catch (error) {
      console.error('Error updating tee time listing:', error);
      res.status(500).json({ message: 'Failed to update tee time listing' });
    }
  });
  
  app.use('/api/tee-times', teeTimeRoutes);
  
  // Booking routes
  const bookingRoutes = express.Router();
  
  bookingRoutes.get('/guest/:guestId', isAuthenticated, async (req, res) => {
    try {
      // Ensure the user is viewing their own bookings
      if (req.user._id.toString() !== req.params.guestId) {
        return res.status(403).json({ message: 'You can only view your own bookings' });
      }
      
      const bookings = await storage.getBookingsByGuestId(req.params.guestId);
      
      // Get detailed information for each booking
      const detailedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
          const club = teeTime ? await storage.getClub(teeTime.clubId) : null;
          const host = teeTime ? await storage.getUser(teeTime.hostId) : null;
          
          return {
            ...booking,
            teeTime,
            club,
            host: host ? {
              _id: host._id,
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
      console.error('Error fetching bookings:', error);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });
  
  bookingRoutes.get('/tee-time/:teeTimeId', isAuthenticated, async (req, res) => {
    try {
      const teeTime = await storage.getTeeTimeListing(req.params.teeTimeId);
      
      // Ensure the user is the host of this tee time
      if (!teeTime || teeTime.hostId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only view bookings for your own tee times' });
      }
      
      const bookings = await storage.getBookingsByTeeTimeId(req.params.teeTimeId);
      
      // Get guest information for each booking
      const detailedBookings = await Promise.all(
        bookings.map(async (booking) => {
          const guest = await storage.getUser(booking.guestId);
          
          return {
            ...booking,
            guest: guest ? {
              _id: guest._id,
              username: guest.username,
              firstName: guest.firstName,
              lastName: guest.lastName,
              profileImage: guest.profileImage,
            } : undefined,
          };
        })
      );
      
      res.json(detailedBookings);
    } catch (error) {
      console.error('Error fetching bookings for tee time:', error);
      res.status(500).json({ message: 'Failed to fetch bookings for tee time' });
    }
  });
  
  bookingRoutes.post('/', isAuthenticated, async (req, res) => {
    try {
      // Ensure the user is booking as themselves
      const bookingData = {
        ...req.body,
        guestId: req.user._id
      };
      
      // Get the tee time to confirm it's available
      const teeTime = await storage.getTeeTimeListing(bookingData.teeTimeId);
      if (!teeTime || teeTime.status !== 'available') {
        return res.status(400).json({ message: 'This tee time is not available for booking' });
      }
      
      // Create the booking
      const booking = await storage.createBooking(bookingData);
      
      // Create a Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(bookingData.totalPrice * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          bookingId: booking._id.toString(),
          teeTimeId: teeTime._id.toString()
        }
      });
      
      // Update the booking with the PaymentIntent ID
      await storage.updateBooking(booking._id, {
        stripePaymentIntentId: paymentIntent.id
      });
      
      // Return the booking and client secret
      res.status(201).json({
        booking,
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });
  
  bookingRoutes.patch('/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }
      
      // Get the booking
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      
      // Get the tee time to check host
      const teeTime = await storage.getTeeTimeListing(booking.teeTimeId);
      
      // Ensure the user is either the host or the guest
      const isHost = teeTime && teeTime.hostId.toString() === req.user._id.toString();
      const isGuest = booking.guestId.toString() === req.user._id.toString();
      
      if (!isHost && !isGuest) {
        return res.status(403).json({ message: 'You are not authorized to update this booking' });
      }
      
      // Different status updates have different requirements
      if (status === 'confirmed' && !isHost) {
        return res.status(403).json({ message: 'Only the host can confirm bookings' });
      }
      
      if (status === 'cancelled' && !isGuest) {
        return res.status(403).json({ message: 'Only the guest can cancel bookings' });
      }
      
      const updatedBooking = await storage.updateBookingStatus(req.params.id, status);
      
      // If the booking is cancelled, update the tee time status back to available
      if (status === 'cancelled') {
        await storage.updateTeeTimeListing(booking.teeTimeId, { status: 'available' });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking status:', error);
      res.status(500).json({ message: 'Failed to update booking status' });
    }
  });
  
  app.use('/api/bookings', bookingRoutes);
  
  // Stripe webhook handler
  app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      // Update booking status
      try {
        const bookingId = paymentIntent.metadata.bookingId;
        const teeTimeId = paymentIntent.metadata.teeTimeId;
        
        // Update booking status to confirmed
        await storage.updateBookingStatus(bookingId, 'confirmed');
        
        // Update tee time status to booked
        await storage.updateTeeTimeListing(teeTimeId, { status: 'booked' });
      } catch (error) {
        console.error('Error processing payment success webhook:', error);
      }
    }
    
    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  });
  
  // Health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  return app;
}

/**
 * Helper function to score tee time listings based on search criteria
 */
function applySearchRelevanceScoring(listings, criteria) {
  const { location, date, players } = criteria;
  
  const scoredListings = listings.map(listing => {
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
    
    // Date relevance (medium priority - up to 8 points)
    if (date && typeof date === 'string') {
      try {
        const searchDate = new Date(date);
        const listingDate = new Date(listing.date);
        
        // Exact date match
        if (
          searchDate.getFullYear() === listingDate.getFullYear() &&
          searchDate.getMonth() === listingDate.getMonth() &&
          searchDate.getDate() === listingDate.getDate()
        ) {
          relevanceScore += 8;
        } 
        // Same week (within 3 days)
        else if (Math.abs(searchDate.getTime() - listingDate.getTime()) < 3 * 24 * 60 * 60 * 1000) {
          relevanceScore += 4;
        }
        // Within two weeks
        else if (Math.abs(searchDate.getTime() - listingDate.getTime()) < 14 * 24 * 60 * 60 * 1000) {
          relevanceScore += 2;
        }
      } catch (e) {
        // Invalid date format, ignore
      }
    }
    
    // Players relevance (lower priority - up to 5 points)
    if (players && typeof players === 'number') {
      if (listing.playersAllowed >= players) {
        // Exact match (e.g., requested 4, available 4)
        if (listing.playersAllowed === players) {
          relevanceScore += 5;
        } 
        // Has more spots than needed but not too many
        else if (listing.playersAllowed <= players + 2) {
          relevanceScore += 3;
        }
        // Has spots, but many more than needed
        else {
          relevanceScore += 1;
        }
      }
    }
    
    return {
      ...listing,
      relevanceScore
    };
  });
  
  // Sort by relevance score (highest first)
  return scoredListings.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

module.exports = { registerRoutes };