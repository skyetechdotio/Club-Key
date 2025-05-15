const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectToDatabase } = require('./db');
const { validateFirebaseToken } = require('./firebase-auth');
const mongoStorage = require('./mongo-storage');
const session = require('express-session');

// Create Express app
const app = express();

/**
 * Configure Express application with middleware
 */
async function configureApp() {
  // Connect to MongoDB first
  await connectToDatabase();

  // Set up session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'golf-linx-secret',
    resave: false,
    saveUninitialized: false,
    store: mongoStorage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true
    }
  }));

  // Basic middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static files middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../public')));
  }

  // Authentication middleware - applies to all /api routes except auth-related ones
  app.use('/api', (req, res, next) => {
    // Skip authentication for these endpoints
    if (
      req.path.startsWith('/auth') ||
      req.path === '/health' ||
      req.path === '/webhook'
    ) {
      return next();
    }
    
    validateFirebaseToken(req, res, next);
  });

  return app;
}

module.exports = { configureApp, app };