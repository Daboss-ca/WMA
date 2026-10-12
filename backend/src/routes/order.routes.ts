// backend/src/routes/order.routes.ts
import { Router } from 'express';
import { createOrder, getUserOrders } from '../controllers/order.controller';

const router = Router();

// POST endpoint para sa checkout
router.post('/checkout', createOrder);

// GET endpoint para makuha ang orders ng user
router.get('/', getUserOrders);

export default router;