import type { Request, Response, NextFunction } from 'express';
import { receiptService } from '../services/receiptService.js';
import { ocrService } from '../services/ocrService.js';
import { storageService } from '../services/storageService.js';
import { geminiVisionService } from '../services/geminiVisionService.js';
import { BadRequestError } from '../utils/errors.js';
import { db } from '../config/firebase-admin.js';
import type { Receipt } from '../types/models.js';

export async function uploadReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      throw new BadRequestError('No receipt image or PDF file uploaded');
    }

    const businessId = req.businessId!;
    const receiptsRef = db.collection('businesses').doc(businessId).collection('receipts');
    const newDocRef = receiptsRef.doc();
    const receiptId = newDocRef.id;

    // 1. Upload to authenticated business-scoped Cloud Storage path
    const uploadResult = await storageService.uploadReceiptFile(businessId, receiptId, file);

    const now = new Date().toISOString();
    const initialReceipt: Receipt = {
      id: receiptId,
      businessId,
      receiptDate: now.slice(0, 10),
      purchaseDate: now.slice(0, 10),
      supplier: { name: 'Processing...' },
      payment: { method: 'cash', status: 'paid' },
      currency: 'INR',
      subtotalMinor: 0,
      taxTotalMinor: 0,
      discountTotalMinor: 0,
      roundOffMinor: 0,
      grandTotalMinor: 0,
      reviewStatus: 'processing',
      imagePath: uploadResult.storagePath,
      lineItemCount: 0,
      tags: [],
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await newDocRef.set(initialReceipt);

    // 2. Trigger Gemini Vision Extraction
    const extractionResult = await geminiVisionService.extractReceiptData(
      businessId,
      receiptId,
      file.buffer,
      file.mimetype
    );

    res.status(201).json({
      status: 201,
      message: 'Receipt uploaded and processed successfully',
      data: extractionResult,
    });
  } catch (error) {
    next(error);
  }
}

export async function listReceipts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await receiptService.listReceipts(req.businessId!, req.query as any);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getReceiptById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await receiptService.getReceiptById(req.businessId!, req.params.receiptId as string);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await receiptService.createReceipt(req.businessId!, req.user!.uid, req.body);
    res.status(201).json({
      status: 201,
      message: 'Receipt draft created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await receiptService.updateReceipt(req.businessId!, req.params.receiptId as string, req.body);
    res.json({
      status: 200,
      message: 'Receipt updated with recalculated totals',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await receiptService.confirmReceipt(
      req.businessId!,
      req.params.receiptId as string,
      req.user!.uid,
      req.body?.notes
    );
    res.json({
      status: 200,
      message: 'Receipt confirmed and committed to bahi khata',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function retryReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await receiptService.retryReceipt(req.businessId!, req.params.receiptId as string);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function extractReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await ocrService.extractReceipt(req.businessId!, req.params.receiptId as string);
    res.json({
      status: 200,
      message: 'OCR extraction completed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
