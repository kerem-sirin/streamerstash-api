import { Router } from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = Router();

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
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

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    [
        body('email', 'Please include a valid email').isEmail(),
        body('password', 'Password is required').exists(),
    ],
    loginUser
);

export default router;