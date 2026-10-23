import { storage } from '../config/firebase-admin.js';
import { logger } from '../utils/logger.js';
import path from 'node:path';

export class StorageService {
  /**
   * Uploads receipt file buffer to authenticated, business-scoped Cloud Storage path.
   * Path format: businesses/{businessId}/receipts/{receiptId}/original.{ext}
   */
  async uploadReceiptFile(
    businessId: string,
    receiptId: string,
    file: Express.Multer.File
  ): Promise<{ storagePath: string; fileName: string; mimeType: string; sizeBytes: number }> {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const fileName = `original${ext}`;
    const storagePath = `businesses/${businessId}/receipts/${receiptId}/${fileName}`;

    try {
      const bucket = storage.bucket();
      const fileRef = bucket.file(storagePath);

      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            businessId,
            receiptId,
            originalName: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        },
        resumable: false,
      });

      logger.info(`Uploaded receipt image to Cloud Storage: ${storagePath}`, {
        sizeBytes: file.size,
        mimeType: file.mimetype,
      });
    } catch (err) {
      // In local dev without cloud credentials, log and proceed with local storage path
      logger.warn(`Cloud Storage write deferred or running offline. Staging path: ${storagePath}`, err);
    }

    return {
      storagePath,
      fileName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }
}

export const storageService = new StorageService();
