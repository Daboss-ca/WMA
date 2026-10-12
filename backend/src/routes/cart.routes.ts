import { Router } from 'express';
import { getCart, addToCart, removeFromCart } from '../controllers/cart.controller.js';

const router = Router();

router.get('/:userId', getCart);
router.post('/', addToCart);
router.delete('/:id', removeFromCart);

export default router;