import type { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase-admin.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import type { BusinessRole } from '../types/models.js';

export async function requireBusinessTenant(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.user.uid) {
    return next(new UnauthorizedError('User authentication required before verifying business membership'));
  }

  // Extract businessId from header or query param
  let businessId = (req.headers['x-business-id'] as string) || (req.query.businessId as string);

  // If not provided in header or query, attempt to read activeBusinessId from user profile, or default to biz_{uid}
  if (!businessId) {
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (userDoc.exists) {
        businessId = userDoc.data()?.activeBusinessId;
      }
    } catch {
      // Fall through
    }
    if (!businessId) {
      businessId = `biz_${req.user.uid}`;
    }
  }

  try {
    const businessRef = db.collection('businesses').doc(businessId);
    let businessDoc = await businessRef.get();

    // Auto-provision the user's isolated business tenant if requesting their own biz_{uid}
    if (!businessDoc.exists && businessId === `biz_${req.user.uid}`) {
      const uid = req.user.uid;
      const userDoc = await db.collection('users').doc(uid).get().catch(() => null);
      const userData = userDoc?.exists ? userDoc.data() : undefined;
      const nowIso = new Date().toISOString();
      const ownerName = userData?.displayName || req.user.name || (req.user.email ? req.user.email.split('@')[0] : 'Store Owner');
      const shopName = userData?.shopName || `${ownerName}'s Shop`;

      const newBusiness = {
        id: businessId,
        name: shopName,
        legalName: shopName,
        businessType: userData?.businessType || 'kirana',
        gstin: userData?.gstin || '',
        ownerUid: uid,
        memberUids: [uid],
        members: {
          [uid]: {
            uid,
            role: 'owner',
            displayName: ownerName,
            email: req.user.email || userData?.email || '',
            addedAt: nowIso,
            addedBy: uid,
          },
        },
        currency: 'INR',
        currencySymbol: '₹',
        phone: userData?.phone || '',
        email: req.user.email || userData?.email || '',
        settings: {
          defaultTaxSlabs: [0, 5, 12, 18, 28],
          confidenceThreshold: 0.85,
          requireReviewForUncertain: true,
          dailyReconciliationReminder: true,
          language: 'en',
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await businessRef.set(newBusiness, { merge: true });
      businessDoc = await businessRef.get();
    }

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
