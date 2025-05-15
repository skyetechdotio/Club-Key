// Entry point for the server with MongoDB and Firebase
const { configureApp } = require('./new-express-app');
const { registerRoutes } = require('./new-routes');
const { startServer } = require('./new-index');

// Start the server
(async () => {
  try {
    // This function call configures the Express app,
    // registers the routes, sets up the WebSocket server,
    // starts the reminder service, and begins listening for requests
    await startServer();
    
    console.log('Server started successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();