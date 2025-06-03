const { getDb, collections } = require('./db');
const { ObjectId } = require('mongodb');
const session = require('express-session');
const MongoStore = require('connect-mongo');

/**
 * MongoDB implementation of the storage interface
 */
class MongoStorage {
  constructor() {
    this.sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      dbName: 'linxGolf',
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60, // 14 days
      autoRemove: 'native'
    });
  }

  // Helper method to get a collection
  async getCollection(collectionName) {
    const db = await getDb();
    return db.collection(collectionName);
  }

  // User operations
  async getUser(id) {
    const userCollection = await this.getCollection(collections.USERS);
    const query = typeof id === 'string' ? { firebaseId: id } : { _id: new ObjectId(id) };
    return userCollection.findOne(query);
  }

  async getUserByUsername(username) {
    const userCollection = await this.getCollection(collections.USERS);
    return userCollection.findOne({ username });
  }

  async getUserByEmail(email) {
    const userCollection = await this.getCollection(collections.USERS);
    return userCollection.findOne({ email });
  }

  async getUserByFirebaseId(firebaseId) {
    const userCollection = await this.getCollection(collections.USERS);
    return userCollection.findOne({ firebaseId });
  }

  async createUser(userData) {
    const userCollection = await this.getCollection(collections.USERS);
    const result = await userCollection.insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return this.getUser(result.insertedId);
  }

  async updateUser(id, userData) {
    const userCollection = await this.getCollection(collections.USERS);
    const query = typeof id === 'string' ? { firebaseId: id } : { _id: new ObjectId(id) };
    
    const updatedData = {
      ...userData,
      updatedAt: new Date()
    };
    
    await userCollection.updateOne(query, { $set: updatedData });
    return this.getUser(id);
  }

  async updateUserStripeInfo(id, stripeInfo) {
    const userCollection = await this.getCollection(collections.USERS);
    const query = typeof id === 'string' ? { firebaseId: id } : { _id: new ObjectId(id) };
    
    const updatedData = {
      stripeCustomerId: stripeInfo.customerId,
      updatedAt: new Date()
    };
    
    if (stripeInfo.connectId) {
      updatedData.stripeConnectId = stripeInfo.connectId;
    }
    
    await userCollection.updateOne(query, { $set: updatedData });
    return this.getUser(id);
  }

  async upsertUser(upsertUser) {
    // If firebase ID is provided, use that as the key
    if (upsertUser.firebaseId) {
      const existingUser = await this.getUserByFirebaseId(upsertUser.firebaseId);
      if (existingUser) {
        return this.updateUser(existingUser._id, upsertUser);
      }
    }
    
    // Use email as fallback if provided
    if (upsertUser.email) {
      const existingUser = await this.getUserByEmail(upsertUser.email);
      if (existingUser) {
        return this.updateUser(existingUser._id, upsertUser);
      }
    }
    
    // Otherwise create new user
    return this.createUser(upsertUser);
  }

  // Club operations
  async getClub(id) {
    const clubCollection = await this.getCollection(collections.CLUBS);
    return clubCollection.findOne({ _id: new ObjectId(id) });
  }

  async getClubs() {
    const clubCollection = await this.getCollection(collections.CLUBS);
    return clubCollection.find().toArray();
  }

  async createClub(clubData) {
    const clubCollection = await this.getCollection(collections.CLUBS);
    const result = await clubCollection.insertOne({
      ...clubData,
      createdAt: new Date()
    });
    return this.getClub(result.insertedId);
  }

  // UserClub operations
  async getUserClubs(userId) {
    const userClubCollection = await this.getCollection(collections.USER_CLUBS);
    return userClubCollection.find({ userId: new ObjectId(userId) }).toArray();
  }

  async addUserToClub(userClubData) {
    const userClubCollection = await this.getCollection(collections.USER_CLUBS);
    const result = await userClubCollection.insertOne({
      userId: new ObjectId(userClubData.userId),
      clubId: new ObjectId(userClubData.clubId),
      memberSince: userClubData.memberSince || new Date()
    });
    return userClubCollection.findOne({ _id: result.insertedId });
  }

  // TeeTimeListing operations
  async getTeeTimeListing(id) {
    const teeTimeCollection = await this.getCollection(collections.TEE_TIME_LISTINGS);
    return teeTimeCollection.findOne({ _id: new ObjectId(id) });
  }

  async getTeeTimeListingsByHostId(hostId) {
    const teeTimeCollection = await this.getCollection(collections.TEE_TIME_LISTINGS);
    return teeTimeCollection.find({ hostId: new ObjectId(hostId) }).toArray();
  }

  async getTeeTimeListingsByClubId(clubId) {
    const teeTimeCollection = await this.getCollection(collections.TEE_TIME_LISTINGS);
    return teeTimeCollection.find({ clubId: new ObjectId(clubId) }).toArray();
  }

  async getAvailableTeeTimeListings() {
    const teeTimeCollection = await this.getCollection(collections.TEE_TIME_LISTINGS);
    return teeTimeCollection.find({
      status: "available",
      date: { $gt: new Date() }
    }).toArray();
  }

  async createTeeTimeListing(teeTimeData) {
    const teeTimeCollection = await this.getCollection(collections.TEE_TIME_LISTINGS);
    const result = await teeTimeCollection.insertOne({
      hostId: new ObjectId(teeTimeData.hostId),
      clubId: new ObjectId(teeTimeData.clubId),
      date: new Date(teeTimeData.date),
      price: teeTimeData.price,
      playersAllowed: teeTimeData.playersAllowed || 4,
      notes: teeTimeData.notes || null,
      status: "available",
      createdAt: new Date()
    });
    return this.getTeeTimeListing(result.insertedId);
  }

  async updateTeeTimeListing(id, teeTimeData) {
    const teeTimeCollection = await this.getCollection(collections.TEE_TIME_LISTINGS);
    await teeTimeCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: teeTimeData }
    );
    return this.getTeeTimeListing(id);
  }

  // Booking operations
  async getBooking(id) {
    const bookingCollection = await this.getCollection(collections.BOOKINGS);
    return bookingCollection.findOne({ _id: new ObjectId(id) });
  }

  async getBookingsByGuestId(guestId) {
    const bookingCollection = await this.getCollection(collections.BOOKINGS);
    return bookingCollection.find({ guestId: new ObjectId(guestId) }).toArray();
  }

  async getBookingsByTeeTimeId(teeTimeId) {
    const bookingCollection = await this.getCollection(collections.BOOKINGS);
    return bookingCollection.find({ teeTimeId: new ObjectId(teeTimeId) }).toArray();
  }

  async createBooking(bookingData) {
    const bookingCollection = await this.getCollection(collections.BOOKINGS);
    
    const newBooking = {
      teeTimeId: new ObjectId(bookingData.teeTimeId),
      guestId: new ObjectId(bookingData.guestId),
      numberOfPlayers: bookingData.numberOfPlayers,
      totalPrice: bookingData.totalPrice,
      status: "pending",
      createdAt: new Date(),
      stripePaymentIntentId: null,
      completedAt: null,
      reminderOneWeek: null,
      reminderOneDay: null,
      reminderOneWeekSent: false,
      reminderOneDaySent: false
    };
    
    const result = await bookingCollection.insertOne(newBooking);
    return this.getBooking(result.insertedId);
  }

  async updateBooking(id, bookingData) {
    const bookingCollection = await this.getCollection(collections.BOOKINGS);
    await bookingCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: bookingData }
    );
    return this.getBooking(id);
  }

  async updateBookingStatus(id, status) {
    const bookingCollection = await this.getCollection(collections.BOOKINGS);
    const updateData = { status };
    
    if (status === "completed") {
      updateData.completedAt = new Date();
    }
    
    await bookingCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    return this.getBooking(id);
  }

  // Review operations
  async getReview(id) {
    const reviewCollection = await this.getCollection(collections.REVIEWS);
    return reviewCollection.findOne({ _id: new ObjectId(id) });
  }

  async getReviewsByTargetId(targetId, targetType) {
    const reviewCollection = await this.getCollection(collections.REVIEWS);
    return reviewCollection.find({
      targetId: new ObjectId(targetId),
      targetType
    }).toArray();
  }

  async getReviewsByReviewerId(reviewerId) {
    const reviewCollection = await this.getCollection(collections.REVIEWS);
    return reviewCollection.find({ reviewerId: new ObjectId(reviewerId) }).toArray();
  }

  async createReview(reviewData) {
    const reviewCollection = await this.getCollection(collections.REVIEWS);
    
    const newReview = {
      reviewerId: new ObjectId(reviewData.reviewerId),
      targetId: new ObjectId(reviewData.targetId),
      targetType: reviewData.targetType,
      bookingId: reviewData.bookingId ? new ObjectId(reviewData.bookingId) : null,
      rating: reviewData.rating,
      comment: reviewData.comment || null,
      createdAt: new Date()
    };
    
    const result = await reviewCollection.insertOne(newReview);
    return this.getReview(result.insertedId);
  }

  // Message operations
  async getMessage(id) {
    const messageCollection = await this.getCollection(collections.MESSAGES);
    return messageCollection.findOne({ _id: new ObjectId(id) });
  }

  async getMessagesByBookingId(bookingId) {
    const messageCollection = await this.getCollection(collections.MESSAGES);
    return messageCollection.find(
      { bookingId: new ObjectId(bookingId) },
      { sort: { createdAt: 1 } }
    ).toArray();
  }

  async getConversation(userOneId, userTwoId) {
    const messageCollection = await this.getCollection(collections.MESSAGES);
    return messageCollection.find({
      $or: [
        { senderId: new ObjectId(userOneId), receiverId: new ObjectId(userTwoId) },
        { senderId: new ObjectId(userTwoId), receiverId: new ObjectId(userOneId) }
      ]
    }, { sort: { createdAt: 1 } }).toArray();
  }

  async getUserMessages(userId) {
    const messageCollection = await this.getCollection(collections.MESSAGES);
    return messageCollection.find({
      $or: [
        { senderId: new ObjectId(userId) },
        { receiverId: new ObjectId(userId) }
      ]
    }, { sort: { createdAt: -1 } }).toArray();
  }

  async createMessage(messageData) {
    const messageCollection = await this.getCollection(collections.MESSAGES);
    
    const newMessage = {
      senderId: new ObjectId(messageData.senderId),
      receiverId: new ObjectId(messageData.receiverId),
      bookingId: messageData.bookingId ? new ObjectId(messageData.bookingId) : null,
      content: messageData.content,
      isRead: false,
      createdAt: new Date()
    };
    
    const result = await messageCollection.insertOne(newMessage);
    return this.getMessage(result.insertedId);
  }

  async markMessageAsRead(id) {
    const messageCollection = await this.getCollection(collections.MESSAGES);
    await messageCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isRead: true } }
    );
    return this.getMessage(id);
  }

  // Notification operations
  async getNotification(id) {
    const notificationCollection = await this.getCollection(collections.NOTIFICATIONS);
    return notificationCollection.findOne({ _id: new ObjectId(id) });
  }

  async getNotificationsByUserId(userId) {
    const notificationCollection = await this.getCollection(collections.NOTIFICATIONS);
    return notificationCollection.find(
      { userId: new ObjectId(userId) },
      { sort: { createdAt: -1 } }
    ).toArray();
  }

  async getUnreadNotificationsByUserId(userId) {
    const notificationCollection = await this.getCollection(collections.NOTIFICATIONS);
    return notificationCollection.find(
      { userId: new ObjectId(userId), isRead: false },
      { sort: { createdAt: -1 } }
    ).toArray();
  }

  async createNotification(notificationData) {
    const notificationCollection = await this.getCollection(collections.NOTIFICATIONS);
    
    const newNotification = {
      userId: new ObjectId(notificationData.userId),
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      relatedId: new ObjectId(notificationData.relatedId),
      isRead: notificationData.isRead || false,
      createdAt: new Date()
    };
    
    const result = await notificationCollection.insertOne(newNotification);
    return this.getNotification(result.insertedId);
  }

  async markNotificationAsRead(id) {
    const notificationCollection = await this.getCollection(collections.NOTIFICATIONS);
    await notificationCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isRead: true } }
    );
    return this.getNotification(id);
  }

  async markAllNotificationsAsRead(userId) {
    const notificationCollection = await this.getCollection(collections.NOTIFICATIONS);
    await notificationCollection.updateMany(
      { userId: new ObjectId(userId), isRead: false },
      { $set: { isRead: true } }
    );
  }

  // Reminder operations
  async getRemindersToSend(reminderType, currentDate) {
    const bookingCollection = await this.getCollection(collections.BOOKINGS);
    const teeTimeCollection = await this.getCollection(collections.TEE_TIME_LISTINGS);

    const reminderField = reminderType === 'one_week' ? 'reminderOneWeekSent' : 'reminderOneDaySent';
    
    // Get bookings that need reminders
    const bookings = await bookingCollection.find({
      status: 'confirmed',
      [reminderField]: false
    }).toArray();
    
    // For each booking, get the tee time and check if it's within the reminder window
    const result = [];
    const now = currentDate || new Date();
    
    for (const booking of bookings) {
      const teeTime = await teeTimeCollection.findOne({ _id: booking.teeTimeId });
      if (!teeTime) continue;
      
      // Calculate when the reminder should be sent
      const teeTimeDate = new Date(teeTime.date);
      const reminderDate = new Date(teeTimeDate);
      
      if (reminderType === 'one_week') {
        reminderDate.setDate(reminderDate.getDate() - 7);
      } else {
        reminderDate.setDate(reminderDate.getDate() - 1);
      }
      
      // If we've passed the reminder date and reminder hasn't been sent
      if (now >= reminderDate) {
        result.push(booking);
      }
    }
    
    return result;
  }
}

module.exports = new MongoStorage();