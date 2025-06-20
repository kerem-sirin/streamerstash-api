import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getCart, addItemToCart, removeItemFromCart } from '../controllers/cartController.js';

const router = Router();

// Apply auth middleware to all cart routes
router.use(authMiddleware);

// Define the routes
router.get('/', getCart);
router.post('/items', addItemToCart);
router.delete('/items/:productId', removeItemFromCart);

export default router;