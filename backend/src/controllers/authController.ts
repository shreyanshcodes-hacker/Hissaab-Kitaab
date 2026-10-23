import type { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase-admin.js';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uid = req.user!.uid;

    // Fetch user profile from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    // Fetch all businesses where user is in memberUids
    const businessesSnapshot = await db
      .collection('businesses')
      .where('memberUids', 'array-contains', uid)
      .get();

    const businesses = businessesSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        businessType: data.businessType,
        currency: data.currency || 'INR',
        role: data.members?.[uid]?.role || (data.ownerUid === uid ? 'owner' : 'viewer'),
      };
    });

    res.json({
      status: 200,
      data: {
        uid,
        email: req.user!.email,
        displayName: userData?.displayName || req.user!.name || 'Shopkeeper',
        photoURL: req.user!.picture || null,
        activeBusinessId: userData?.activeBusinessId || businesses[0]?.id || null,
        businesses,
      },
    });
  } catch (error) {
    next(error);
  }
}
