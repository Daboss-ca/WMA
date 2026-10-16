import { Router } from 'express';
import { createReview, listPublicReviews } from '../controllers/review.controller.js';

const router = Router();

router.get('/', listPublicReviews);
router.post('/', createReview);

export default router;
