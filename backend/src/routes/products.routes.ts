import { Router } from 'express';
import { createAdminProduct, listAdminProducts } from '../controllers/admin.controller.js';

const router = Router();

router.get('/products', listAdminProducts);
router.post('/products', createAdminProduct);

export default router;
