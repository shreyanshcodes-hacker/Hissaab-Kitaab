import multer from 'multer';
import type { Request } from 'express';
import { BadRequestError } from '../utils/errors.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 Megabytes

const storage = multer.memoryStorage();

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    return cb(
      new BadRequestError(
        `Unsupported file type '${file.mimetype}'. Only JPG, PNG, WebP, HEIC images and PDF invoices under 15MB are supported.`
      )
    );
  }
  cb(null, true);
}

export const receiptUploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1, // 1 voucher at a time
  },
  fileFilter,
});
