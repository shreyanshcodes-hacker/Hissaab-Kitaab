import type { DecodedIdToken } from 'firebase-admin/auth';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      businessId?: string;
      businessRole?: 'owner' | 'manager' | 'accountant' | 'cashier' | 'viewer';
    }
  }
}

export {};
