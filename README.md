# ClubKey - Golf Tee Time Marketplace

A modern web platform connecting golf enthusiasts with exclusive club tee times, offering an intuitive and data-driven booking experience.

## Overview

Linx is a marketplace for Golf Foursomes, similar to AirBNB or SeatGeek but specialized for golf. The platform allows Golf Club members to register as hosts and list available tee times, while golfing guests can search for and purchase these tee times.

## Tech Stack

- **Frontend**: HTML/CSS with Alpine.js for interactivity
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage
- **Payments**: Stripe Connect with 24-hour escrow system

## Features

- **User Authentication**: Secure login/signup with email/password and Google Authentication
- **User Profiles**: Detailed profiles for both hosts and guests
- **Tee Time Listings**: Search, filter, and book tee times
- **Secure Payments**: Stripe integration for secure transactions with escrow system
- **Reviews & Ratings**: Build reputation and trust through reviews
- **Notifications**: Both in-app and email notifications
- **Responsive Design**: Works on all devices from mobile to desktop

## Getting Started

### Prerequisites

1. Node.js (v14+)
2. MongoDB
3. Firebase project with Authentication enabled
4. Stripe account
5. SendGrid account (for email notifications)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Firebase
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_SERVICE_ACCOUNT=your_service_account_json_stringified

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# Session
SESSION_SECRET=your_session_secret
```

### Installation

1. Clone the repository
2. Install dependencies
   ```
   npm install
   ```
3. Start the server
   ```
   npm run dev
   ```
4. Visit `http://localhost:5000` in your browser

## Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication with email/password and Google sign-in methods
3. Enable Firebase Storage
4. Create a web app in your Firebase project and get the config values
5. Add your Replit domain to the Authorized Domains in Authentication settings

## MongoDB Setup

1. Create a MongoDB Atlas cluster or use a local MongoDB instance
2. Create a database named "linxGolf"
3. Update the `MONGODB_URI` in your .env file

## Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set up Connect accounts for hosts to receive payments
4. Create a webhook endpoint for payment events

## API Routes

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `POST /api/auth/logout` - Logout a user
- `GET /api/auth/me` - Get current user

### Tee Times
- `GET /api/tee-times` - Get all tee time listings
- `GET /api/tee-times/:id` - Get a specific tee time listing
- `POST /api/tee-times` - Create a new tee time listing (host only)
- `PATCH /api/tee-times/:id` - Update a tee time listing (host only)

### Bookings
- `GET /api/bookings/guest/:guestId` - Get bookings for a guest
- `GET /api/bookings/tee-time/:teeTimeId` - Get bookings for a tee time (host only)
- `POST /api/bookings` - Create a new booking
- `PATCH /api/bookings/:id/status` - Update booking status

### Reviews
- `GET /api/reviews/target/:targetId` - Get reviews for a target (host/guest)
- `POST /api/reviews` - Create a new review

### Payments
- `POST /api/payments/create-intent` - Create a payment intent
- `POST /api/webhook` - Stripe webhook endpoint

## Project Structure

```
/
├── public/                # Static assets and client-side code
│   ├── css/               # CSS stylesheets
│   ├── js/                # JavaScript files
│   ├── images/            # Image assets
│   └── index.html         # Main HTML file with Alpine.js components
├── server/                # Server-side code
│   ├── db.js              # MongoDB connection
│   ├── firebase.js        # Firebase configuration
│   ├── firebase-auth.js   # Authentication middleware
│   ├── mongo-storage.js   # Data storage implementation
│   ├── new-express-app.js # Express app configuration
│   ├── new-index.js       # Server entry point
│   ├── new-routes.js      # API routes
│   └── new-reminder-service.js # Reminder service
└── shared/                # Shared code between client and server
    └── schema.ts          # Database schema
```

## License

[MIT](LICENSE)

## Contributors

- Replit AI - Technical Implementation

## Contact

For any questions or feedback, please contact [info@linx-golf.com](mailto:info@linx-golf.com).