import rateLimit from 'express-rate-limit';

export const standardApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Max 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

export const aiOperationsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 AI extraction / chat operations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    code: 'AI_RATE_LIMIT_EXCEEDED',
    message: 'Too many AI processing requests. Please wait a minute before retrying.',
  },
});
