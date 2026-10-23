import type { Request, Response, NextFunction } from 'express';
import { itemService } from '../services/itemService.js';

export async function listItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await itemService.listItems(req.businessId!, req.query as any);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await itemService.getItemById(req.businessId!, req.params.itemId as string);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
