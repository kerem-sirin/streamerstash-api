import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createPaymentIntent } from '../controllers/paymentController.js';

const router = Router();

// @route   POST /api/payments/create-intent
// @desc    Create a Stripe Payment Intent
// @access  Private
router.post('/create-intent', authMiddleware, createPaymentIntent);

export default router;