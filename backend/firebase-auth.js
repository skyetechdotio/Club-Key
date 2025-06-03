const { admin } = require('./firebase');
const mongoStorage = require('./mongo-storage');

/**
 * Middleware to verify Firebase token and attach user to request
 */
const validateFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Get the user from our database based on Firebase ID
    let user = await mongoStorage.getUserByFirebaseId(decodedToken.uid);
    
    // If no user exists in our db but is authenticated with Firebase, create the user
    if (!user) {
      // Get user details from Firebase
      const firebaseUser = await admin.auth().getUser(decodedToken.uid);
      
      // Create user in our database
      user = await mongoStorage.createUser({
        firebaseId: decodedToken.uid,
        email: firebaseUser.email,
        username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        firstName: firebaseUser.displayName?.split(' ')[0] || null,
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || null,
        profileImage: firebaseUser.photoURL || null,
        isHost: false, // By default, new users are not hosts
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Error validating Firebase token:', error);
    return res.status(401).json({ message: 'Unauthorized - Invalid token' });
  }
};

/**
 * Middleware to check if a user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (req.user) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

/**
 * Middleware to check if a user is a host
 */
const isHost = (req, res, next) => {
  if (req.user && req.user.isHost) {
    return next();
  }
  res.status(403).json({ message: 'Forbidden - Host access required' });
};

module.exports = {
  validateFirebaseToken,
  isAuthenticated,
  isHost
};