import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createOrderFromCart } from '../controllers/orderController.js';

const router = Router();

// @route   POST /api/orders
// @desc    Create a new order from the current user's cart
// @access  Private
router.post('/', authMiddleware, createOrderFromCart);

export default router;