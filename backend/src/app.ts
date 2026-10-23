import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { allowedOrigins } from './config/env.js';
import { standardApiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import { logger } from './utils/logger.js';
import apiRouter from './routes/index.js';

export function createApp(): express.Application {
  const app = express();

  // Trust Cloud Run / reverse proxy headers
  app.set('trust proxy', 1);

  // 1. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: false, // API server does not render HTML
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Safe CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-business-id'],
      maxAge: 86400, // 24 hours preflight cache
    })
  );

  // 3. Request Payload Size Limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Rate Limiting
  app.use('/api', standardApiLimiter);

  // 5. Basic Access Logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // 6. Mount Primary API Router
  app.use('/api', apiRouter);

  // 7. 404 Route Catch-All
  app.use((req, _res, next) => {
    next(new NotFoundError(`Endpoint ${req.method} ${req.originalUrl} not found on this server`));
  });

  // 8. Centralized Safe Error Handling Middleware
  app.use(errorHandler);

  return app;
}
