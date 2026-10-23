import type { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analyticsService.js';

export async function getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getSummary(req.businessId!, req.query as any);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getTrends(req.businessId!, req.query as any);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPriceTracker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await analyticsService.getPriceTracker(req.businessId!);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateAiSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const period = (req.body?.period || req.query?.period || 'this_month') as any;
    const result = await analyticsService.generateAiExecutiveSummary(req.businessId!, period);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
