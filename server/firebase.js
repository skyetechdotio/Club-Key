const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables or service account
if (!admin.apps.length) {
  try {
    // Check if we have service account credentials
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Parse the service account JSON if it's provided as a string
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Otherwise initialize with application default credentials
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }
    
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

// Function to inject Firebase config into HTML template
function injectFirebaseConfig(html) {
  return html
    .replace(/{{FIREBASE_API_KEY}}/g, process.env.FIREBASE_API_KEY || '')
    .replace(/{{FIREBASE_AUTH_DOMAIN}}/g, process.env.FIREBASE_AUTH_DOMAIN || '')
    .replace(/{{FIREBASE_PROJECT_ID}}/g, process.env.FIREBASE_PROJECT_ID || '')
    .replace(/{{FIREBASE_STORAGE_BUCKET}}/g, process.env.FIREBASE_STORAGE_BUCKET || '')
    .replace(/{{FIREBASE_MESSAGING_SENDER_ID}}/g, process.env.FIREBASE_MESSAGING_SENDER_ID || '')
    .replace(/{{FIREBASE_APP_ID}}/g, process.env.FIREBASE_APP_ID || '');
}

module.exports = {
  admin,
  injectFirebaseConfig
};