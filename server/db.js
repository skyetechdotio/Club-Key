const { MongoClient, ServerApiVersion } = require('mongodb');

// MongoDB connection URI
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';

// Create a MongoClient with a MongoClientOptions object
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let dbConnection = null;

/**
 * Connect to MongoDB and store the connection
 */
async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    dbConnection = client.db('linxGolf');
    return dbConnection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

/**
 * Get the database connection, connecting if not already connected
 */
async function getDb() {
  if (!dbConnection) {
    return await connectToDatabase();
  }
  return dbConnection;
}

// Collections mapping
const collections = {
  USERS: 'users',
  CLUBS: 'clubs',
  USER_CLUBS: 'userClubs',
  TEE_TIME_LISTINGS: 'teeTimeListings',
  BOOKINGS: 'bookings',
  REVIEWS: 'reviews',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
};

module.exports = {
  connectToDatabase,
  getDb,
  collections,
  client,
};