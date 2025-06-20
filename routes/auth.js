import { Router } from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @route   POST api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @uses    express-validator - For request body validation.
 */
router.post(
    '/register',
    [
        // Add validation rules for email and password
        body('email', 'Please include a valid email').isEmail(),
        body(
            'password',
            'Please enter a password with 6 or more characters'
        ).isLength({ min: 6 }),
    ],
    registerUser
);

/**
 * @route   POST api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 * @uses    express-validator - For request body validation.
 */
router.post(
    '/login',
    [
        body('email', 'Please include a valid email').isEmail(),
        body('password', 'Password is required').exists(),
    ],
    loginUser
);

// @route   GET api/auth/me
// @desc    Get logged-in user's data
// @access  Private (notice we add the middleware here)
router.get('/me', authMiddleware, getMe);

export default router;