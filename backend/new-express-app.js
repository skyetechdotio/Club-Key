const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { connectToDatabase } = require('./db');
const { validateFirebaseToken } = require('./firebase-auth');
const { injectFirebaseConfig } = require('./firebase');
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

  // Stripe webhook needs raw body
  app.use('/api/webhook', express.raw({ type: 'application/json' }));

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

  // Serve static files from the public directory
  app.use(express.static(path.join(__dirname, '../public')));

  // Special handling for HTML files to inject Firebase config
  app.get('*', async (req, res, next) => {
    // If this is an API request or already handled, skip
    if (req.path.startsWith('/api') || req.path.includes('.')) {
      return next();
    }

    try {
      // Read the index.html file
      const indexPath = path.join(__dirname, '../public/index.html');
      const html = await fs.readFile(indexPath, 'utf8');
      
      // Inject Firebase configuration
      const injectedHtml = injectFirebaseConfig(html);
      
      // Send the HTML with the correct content type
      res.setHeader('Content-Type', 'text/html');
      res.send(injectedHtml);
    } catch (error) {
      console.error('Error serving HTML:', error);
      next(error);
    }
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Express error:', err);
    
    res.status(err.status || 500).json({
      message: err.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  return app;
}

module.exports = { configureApp, app };