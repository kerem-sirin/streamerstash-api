import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';
import { createProduct, getProducts, getProductById } from '../controllers/productController.js';

const router = Router();

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Requires 'artist' or 'admin' role)
router.post(
    '/',
    [authMiddleware, authorize(['artist', 'admin'])],
    createProduct
);

// @route   GET /api/products
// @desc    Get all published products
// @access  Public
router.get('/', getProducts);

// @route   GET /api/products/:id
// @desc    Get a single product by ID
// @access  Public
router.get('/:id', getProductById);

export default router;