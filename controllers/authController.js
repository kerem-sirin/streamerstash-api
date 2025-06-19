import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';

export const registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // Convert the salt rounds from a string in .env to a number
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);
        if (isNaN(saltRounds)) {
            throw new Error('BCRYPT_SALT_ROUNDS is not a number');
        }

        // Hash the password
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = {
            id: Date.now(),
            email: email,
            password: hashedPassword,
        };

        console.log("User created (in memory):", user);

        const payload = {
            user: {
                id: user.id,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN },
            (err, token) => {
                if (err) throw err;
                res.status(201).json({ token });
            }
        );
    } catch (err) {
        // Log the specific error message to the console
        console.error("Error in registerUser:", err.message);
        res.status(500).send('Server Error');
    }
};