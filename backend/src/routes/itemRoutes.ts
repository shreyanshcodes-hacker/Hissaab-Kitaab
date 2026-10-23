import { Router } from 'express';
import { listItems, getItemById } from '../controllers/itemController.js';
import { validateRequest } from '../middleware/validate.js';
import {
  ItemsFilterQuerySchema,
  ItemIdParamSchema,
} from '../schemas/api.schemas.js';

const router = Router();

// GET /api/items
router.get('/', validateRequest({ query: ItemsFilterQuerySchema }), listItems);

// GET /api/items/:itemId
router.get('/:itemId', validateRequest({ params: ItemIdParamSchema }), getItemById);

export default router;
