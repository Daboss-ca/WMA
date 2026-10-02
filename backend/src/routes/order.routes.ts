import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';

const router = Router();

router.post('/checkout', OrderController.checkout);
router.get('/:userId', OrderController.getOrders);

export default router;