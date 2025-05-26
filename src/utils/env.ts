// Helper to get environment variables with type safety
function getEnvVar(name: string): string;
function getEnvVar(name: string, fallback: string): string;
function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  
  if (value === undefined) {
    if (fallback === undefined) {
      throw new Error(`❌ Missing required environment variable: ${name}`);
    }
    return fallback;
  }
  
  return value;
}

// Environment detection
const NODE_ENV = getEnvVar('NODE_ENV', 'development');
const isProduction = NODE_ENV === 'production';

export const env = {
  // Core
  NODE_ENV,
  isProduction,
  
  // Server
  PORT: getEnvVar('PORT', '4000'),
  
  // URLs
  APP_URL: getEnvVar('APP_URL', 'http://localhost:3000'),
  API_URL: getEnvVar('API_URL', 'http://localhost:4000'),
  
  // Database
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  
  // Session
  SESSION_SECRET: getEnvVar('SESSION_SECRET'),
  
  // OAuth (Google)
  GOOGLE_CLIENT_ID: getEnvVar('AUTH_GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: getEnvVar('AUTH_GOOGLE_CLIENT_SECRET'),
  GOOGLE_CALLBACK_URL: getEnvVar('AUTH_GOOGLE_CALLBACK_URL', 'http://localhost:4000/api/auth/google/callback'),
  
  // CORS
  CORS_ORIGIN: isProduction 
    ? getEnvVar('APP_URL')
    : [
        'http://localhost:3000',
        'http://localhost:4000',
        'http://localhost:19006', // For React Native
      ],
} as const;
