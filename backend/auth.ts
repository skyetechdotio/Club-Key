import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { sendPasswordResetEmail, sendPasswordResetSuccessEmail } from "./notifications/password-reset";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    // Check if the stored password has the expected format
    if (!stored.includes('.')) {
      console.error('Invalid stored password format (missing salt separator)');
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    
    // Additional validation to prevent buffer length errors
    if (!hashed || !salt) {
      console.error('Invalid stored password format (missing hash or salt)');
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    // Ensure both buffers have the same length
    if (hashedBuf.length !== suppliedBuf.length) {
      console.error(`Buffer length mismatch: ${hashedBuf.length} vs ${suppliedBuf.length}`);
      return false;
    }
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Setup session store with PostgreSQL
  const PostgresStore = connectPg(session);
  const sessionStore = new PostgresStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "golflinx-session-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy for authentication via email/password
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        console.log(`Attempting login for email: ${email}`);
        const user = await storage.getUserByEmail(email);
        
        if (!user) {
          console.log(`User not found with email: ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        if (!user.password) {
          console.log(`User found but no password set: ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          console.log(`Invalid password for user: ${email}`);
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        console.log(`Login successful for user: ${email}`);
        return done(null, user);
      } catch (err) {
        console.error(`Login error for ${email}:`, err);
        return done(err);
      }
    })
  );

  // Serialize user to store in session
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Set up authentication routes
  app.post("/api/register", async (req, res, next) => {
    try {
      // Check if username exists and is already taken (if provided)
      if (req.body.username) {
        const existingUser = await storage.getUserByUsername(req.body.username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }

      // Check if email already exists
      if (req.body.email) {
        const existingEmail = await storage.getUserByEmail(req.body.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      // Hash password
      const hashedPassword = await hashPassword(req.body.password);

      // If no username is provided, generate one from email (for backward compatibility)
      const userData = {
        ...req.body,
        password: hashedPassword,
      };
      
      if (!userData.username) {
        // Create a username from email (remove @ and domain, add random digits)
        const emailPrefix = req.body.email.split('@')[0];
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        userData.username = `${emailPrefix}${randomDigits}`;
      }

      // Create user with onboarding flag
      const user = await storage.createUser({
        ...userData,
        onboardingCompleted: false
      });

      // Log in the user automatically
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: UserType | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as UserType;
    res.json(userWithoutPassword);
  });

  // Password reset request - step 1: User requests reset
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      
      if (user) {
        // Generate a reset token
        const resetToken = randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        
        // Store the reset token in the database for the user
        await storage.updateUser(user.id, {
          resetToken,
          resetTokenExpiry: resetTokenExpiry,
        });
        
        // Send email with reset token
        await sendPasswordResetEmail(user, resetToken);
        
        // Log for development
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Reset password link: /reset-password?token=${resetToken}`);
        }
      }
      
      // For security, always return success even if the email doesn't exist
      // This prevents email enumeration attacks
      res.status(200).json({ message: "If an account exists, a password reset link has been sent" });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process reset request" });
    }
  });
  
  // Password reset request - step 2: User submits new password with token
  app.post("/api/auth/reset-password/confirm", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      // Find user with this reset token
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.resetTokenExpiry) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Check if token is expired
      const tokenExpiry = new Date(user.resetTokenExpiry);
      if (tokenExpiry < new Date()) {
        return res.status(400).json({ message: "Reset token has expired" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password and clear reset token fields
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });
      
      // Send confirmation email
      await sendPasswordResetSuccessEmail(user);
      
      res.status(200).json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Password reset confirmation error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Middleware to check if user is a host
export const isHost = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated() && (req.user as UserType).isHost) {
    return next();
  }
  res.status(403).json({ message: "Access denied" });
};