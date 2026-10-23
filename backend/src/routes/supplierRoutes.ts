import { Router } from 'express';
import { listSuppliers, getSupplierById } from '../controllers/supplierController.js';
import { validateRequest } from '../middleware/validate.js';
import {
  SuppliersFilterQuerySchema,
  SupplierIdParamSchema,
} from '../schemas/api.schemas.js';

const router = Router();

// GET /api/suppliers
router.get('/', validateRequest({ query: SuppliersFilterQuerySchema }), listSuppliers);

// GET /api/suppliers/:supplierId
router.get('/:supplierId', validateRequest({ params: SupplierIdParamSchema }), getSupplierById);

export default router;
