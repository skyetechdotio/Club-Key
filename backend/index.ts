import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startReminderService } from "./reminder-service";
import bookingService from "./booking-service";

// Important: We don't apply JSON middleware to the webhook path
// so that it can receive the raw request body
const app = express();
const jsonParser = express.json({ limit: '50mb' });
const urlEncodedParser = express.urlencoded({ extended: false, limit: '50mb' });

// Apply middleware conditionally - Skip for webhook paths
app.use((req, res, next) => {
  if (req.path === '/api/webhook') {
    // Skip body parsing for webhook endpoint
    return next();
  }
  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === '/api/webhook') {
    // Skip body parsing for webhook endpoint
    return next();
  }
  urlEncodedParser(req, res, next);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 3001
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 3001;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the reminder service
    startReminderService();
    log(`reminder service started`);
    
    // Start the booking service (Timekit-like functionality)
    bookingService.init();
    log(`booking service started`);
  });
})();
