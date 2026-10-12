
import { Router } from 'express';
import { createInquiry } from '../controllers/inquiry.controller';

const router = Router();

router.post('/', createInquiry);

export default router;