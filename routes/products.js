import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, linkAssetToProduct, addPreviewImage } from '../controllers/productController.js';

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

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (permission logic is in the controller)
router.put('/:id', authMiddleware, updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (permission logic is in the controller)
router.delete('/:id', authMiddleware, deleteProduct);

// @route   PUT /api/products/:id/asset
// @desc    Link an S3 asset to a product
// @access  Private
router.put('/:id/asset', authMiddleware, linkAssetToProduct);

// @route   POST /api/products/:id/previews
// @desc    Add a preview image to a product
// @access  Private
router.post('/:id/previews', authMiddleware, addPreviewImage);

export default router;