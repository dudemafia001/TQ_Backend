import dotenv from "dotenv";

dotenv.config();

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || 'development'
  },

  // Database Configuration
  database: {
    mongoUri: process.env.MONGO_URI
  },

  // CORS Configuration - Frontend URLs
  cors: {
    // Allow multiple frontend URLs for development and production
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : ['http://localhost:3000', 'http://localhost:3001']
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // Payment Configuration (Razorpay)
  payment: {
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET
    }
  },

  // Email/SMS Configuration (if applicable)
  communication: {
    smsApiKey: process.env.SMS_API_KEY,
    emailService: {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD
    }
  },

  // File Upload Configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '5mb',
    uploadDir: process.env.UPLOAD_DIR || 'uploads'
  }
};

export default config;