import { Router } from 'express';
import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminOrder,
  listAdminOrders,
  listAdminProducts,
  updateAdminOrderStatus,
  updateAdminProduct,
} from '../controllers/admin.controller.js';
import { uploadProductImage } from '../middleware/uploadProductImage.js';

const router = Router();

router.get('/products', listAdminProducts);
router.post('/products', uploadProductImage, createAdminProduct);
router.put('/products/:id', uploadProductImage, updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);

router.get('/orders', listAdminOrders);
router.get('/orders/:id', getAdminOrder);
router.patch('/orders/:id/status', updateAdminOrderStatus);

export default router;
