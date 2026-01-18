import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables in production
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required in production');
}

if (isProduction && !process.env.SHARED_SECRET) {
  throw new Error('SHARED_SECRET environment variable is required in production');
}

export const config = {
  port: process.env.PORT || 3000,
  // JWT secret for token signing - MUST be set in production
  jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-secret-key'),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL,
  corsOrigin: process.env.CORS_ORIGIN || (isProduction ? undefined : '*'),
  sessionTimeout: 3600000, // 1 hour in ms
  // Shared secret for authentication - clients must provide this to create sessions
  sharedSecret: process.env.SHARED_SECRET || (isProduction ? '' : 'dev-shared-secret'),
};
