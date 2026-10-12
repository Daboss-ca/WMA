// backend/src/routes/order.routes.ts
import { Router } from 'express';
import { createOrder, getUserOrders, uploadPaymentProof } from '../controllers/order.controller';

const router = Router();

router.post('/checkout', createOrder);
router.get('/', getUserOrders);
router.post('/payment-proof', uploadPaymentProof);

export default router;