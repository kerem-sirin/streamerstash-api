import { Router } from 'express';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

const router = Router();

// @route   GET /api/admin/test
// @desc    A test route for admin access
// @access  Private (Admin only)
router.get(
    '/test',
    [authMiddleware, authorize(['admin'])], // Chain middlewares: first authenticate, then authorize.
    (req, res) => {
        // This code only runs if the user is an admin
        res.json({ msg: `Welcome Admin ${req.user.email}! You have permission.` });
    }
);

export default router;