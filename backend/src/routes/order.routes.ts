// backend/src/routes/order.routes.ts
import { Router } from 'express';
import { createOrder, getUserOrders, updateOrderStatus, uploadPaymentProof } from '../controllers/order.controller';

const router = Router();

router.post('/checkout', createOrder);
router.get('/', getUserOrders);
router.patch('/:id/status', updateOrderStatus);
router.post('/payment-proof', uploadPaymentProof);

export default router;