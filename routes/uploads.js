import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';
import { getUploadUrl } from '../controllers/uploadController.js';

const router = Router();

// @route   POST /api/uploads/url
// @desc    Get a pre-signed URL for uploading any file
// @access  Private (Artists, Admins)
router.post(
    '/url', // The path has changed from '/asset' to '/url'
    [authMiddleware, authorize(['artist', 'admin'])],
    getUploadUrl
);

export default router;