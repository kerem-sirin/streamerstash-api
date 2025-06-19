import { Router } from 'express';
import { body } from 'express-validator';
import { registerUser } from '../controllers/authController.js';

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

export default router;