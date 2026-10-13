import { Router } from 'express';
import {
  createAdminProduct,
  deleteAdminProduct,
  listAdminOrders,
  listAdminProducts,
  updateAdminOrderStatus,
  updateAdminProduct,
} from '../controllers/admin.controller.js';

const router = Router();

router.get('/products', listAdminProducts);
router.post('/products', createAdminProduct);
router.put('/products/:id', updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);

router.get('/orders', listAdminOrders);
router.patch('/orders/:id/status', updateAdminOrderStatus);

export default router;
