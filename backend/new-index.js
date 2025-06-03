const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { configureApp } = require('./express-app');
const { registerRoutes } = require('./routes');
const { startReminderService } = require('./reminder-service');

/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    // Configure Express application
    const app = await configureApp();
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Set up WebSocket server
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    
    // WebSocket connection handler
    wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      
      ws.on('message', (message) => {
        console.log('Received message:', message);
        
        // Here we would process the message and possibly broadcast to other clients
        try {
          const data = JSON.parse(message);
          
          // Broadcast to all connected clients if needed
          wss.clients.forEach((client) => {
            if (client.readyState === ws.OPEN) {
              client.send(JSON.stringify({
                type: 'update',
                data
              }));
            }
          });
        } catch (error) {
          console.error('Error processing message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
      
      // Send initial connection acknowledgment
      ws.send(JSON.stringify({ type: 'connection', status: 'connected' }));
    });
    
    // Register API routes
    await registerRoutes(app);
    
    // Start the reminder service
    const reminderService = startReminderService();
    
    // Start listening on the configured port
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });
    
    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down server...');
      
      // Stop the reminder service if it's running
      if (reminderService) {
        clearInterval(reminderService);
      }
      
      // Close the WebSocket server
      wss.close(() => {
        console.log('WebSocket server closed');
      });
      
      // Close the HTTP server
      httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
      
      // If everything doesn't close properly within 5 seconds, force exit
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
    };
    
    // Listen for shutdown signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    return { app, httpServer, wss };
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer };