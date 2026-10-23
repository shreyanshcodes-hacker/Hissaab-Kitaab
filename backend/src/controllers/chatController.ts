import type { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chatService.js';

export async function handleChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message, history } = req.body;
    const result = await chatService.processChatQuery(req.businessId!, message, history);
    res.json({
      status: 200,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
