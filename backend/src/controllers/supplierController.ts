import type { Request, Response, NextFunction } from 'express';
import { supplierService } from '../services/supplierService.js';

export async function listSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await supplierService.listSuppliers(req.businessId!, req.query as any);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSupplierById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await supplierService.getSupplierById(req.businessId!, req.params.supplierId as string);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
