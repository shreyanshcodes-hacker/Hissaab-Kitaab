import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Validation Errors (HTTP 400)
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    logger.warn('Request validation failed', { errors: formattedErrors });
    res.status(400).json({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request payload validation failed',
      details: formattedErrors,
    });
    return;
  }

  // 2. Custom Application HttpErrors
  if (err instanceof HttpError) {
    logger.warn(`Handled HTTP ${err.statusCode}: ${err.message}`, {
      code: err.code,
      details: err.details,
    });
    res.status(err.statusCode).json({
      status: err.statusCode,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // 3. Unhandled Unexpected Internal Server Errors (HTTP 500)
  logger.error('Unhandled internal server error', err);

  res.status(500).json({
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred while processing your request',
    // In development only, attach internal message for debugging
    ...(env.NODE_ENV === 'development' ? { devMessage: err.message } : {}),
  });
}
