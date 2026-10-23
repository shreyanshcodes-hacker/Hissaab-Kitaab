import type { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase-admin.js';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import type { BusinessRole } from '../types/models.js';

export async function requireBusinessTenant(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.user.uid) {
    return next(new UnauthorizedError('User authentication required before verifying business membership'));
  }

  // Extract businessId from header or query param
  let businessId = (req.headers['x-business-id'] as string) || (req.query.businessId as string);

  // If not provided in header or query, attempt to read activeBusinessId from user profile
  if (!businessId) {
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (userDoc.exists) {
        businessId = userDoc.data()?.activeBusinessId;
      }
    } catch {
      // Fall through to error
    }
  }

  if (!businessId) {
    return next(new BadRequestError('Missing business context. Provide x-business-id header or businessId parameter'));
  }

  try {
    const businessDoc = await db.collection('businesses').doc(businessId).get();

    if (!businessDoc.exists) {
      return next(new ForbiddenError('Business not found or access denied'));
    }

    const businessData = businessDoc.data();
    const uid = req.user.uid;

    const isMemberUid = Array.isArray(businessData?.memberUids) && businessData.memberUids.includes(uid);
    const memberRole = businessData?.members?.[uid]?.role;
    const isOwner = businessData?.ownerUid === uid;

    if (!isMemberUid && !memberRole && !isOwner) {
      return next(new ForbiddenError('You do not have permission to access data for this store'));
    }

    req.businessId = businessId;
    req.businessRole = (isOwner ? 'owner' : (memberRole || 'viewer')) as BusinessRole;

    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(allowedRoles: BusinessRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.businessRole || !allowedRoles.includes(req.businessRole)) {
      return next(new ForbiddenError(`Insufficient permissions. Requires one of: ${allowedRoles.join(', ')}`));
    }
    return next();
  };
}
