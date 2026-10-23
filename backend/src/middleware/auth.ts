import type { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase-admin.js';
import { UnauthorizedError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header. Expected Bearer <token>'));
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // Allow explicit guest and demo mode tokens only in development / test
  if (process.env.NODE_ENV !== 'production') {
    if (token === 'demo_stranger_token') {
      req.user = {
        uid: 'user_outsider_999',
        email: 'outsider@otherstore.in',
        name: 'Outsider Merchant',
      } as any;
      return next();
    }

    if (
      token === 'guest-demo-token' ||
      token === 'demo-token' ||
      token.startsWith('demo_') ||
      token === 'dev_token'
    ) {
      req.user = {
        uid: 'user_ramesh_sharma',
        email: 'ramesh@sharmakiranastore.in',
        name: 'Ramesh Sharma',
      } as any;
      return next();
    }
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error: any) {
    logger.warn('Firebase ID token verification failed', {
      errorCode: error.code || 'UNKNOWN_AUTH_ERROR',
    });
    return next(new UnauthorizedError('Invalid, expired, or revoked Firebase ID token'));
  }
}
