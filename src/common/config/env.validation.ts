import * as Joi from 'joi';

/**
 * Environment Variables Validation Schema
 *
 * Validates all environment variables at application startup.
 * Fails fast if required variables are missing or invalid.
 */
export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_CONNECTION_LIMIT: Joi.number().optional(),
  DATABASE_POOL_TIMEOUT: Joi.number().optional(),

  // Authentication
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  COOKIE_SECRET: Joi.string().min(32).required(),

  // CORS
  ALLOWED_ORIGINS: Joi.string().optional(),

  // Redis (optional but recommended)
  REDIS_URL: Joi.string().optional(),
  REDIS_DB: Joi.number().default(0),

  // Email (optional)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(900),
  RATE_LIMIT_MAX: Joi.number().default(100),
  AUTH_RATE_LIMIT_TTL: Joi.number().default(900),
  AUTH_RATE_LIMIT_MAX: Joi.number().default(5),

  // Encryption
  ENCRYPTION_KEY: Joi.string().min(32).optional(),

  // AWS (optional)
  AWS_REGION: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_S3_BUCKET: Joi.string().optional(),

  // Sentry (optional)
  SENTRY_DSN: Joi.string().uri().optional(),

  // OAuth (optional)
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),
  GITHUB_CLIENT_ID: Joi.string().optional(),
  GITHUB_CLIENT_SECRET: Joi.string().optional(),
  GITHUB_CALLBACK_URL: Joi.string().uri().optional(),

  // Feature Flags
  ENABLE_SWAGGER: Joi.boolean().default(true),
  ENABLE_2FA: Joi.boolean().default(false),
  ENABLE_EMAIL_VERIFICATION: Joi.boolean().default(false),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info'),
  LOG_OUTPUT: Joi.string().valid('console', 'file', 'both').default('console'),
});
