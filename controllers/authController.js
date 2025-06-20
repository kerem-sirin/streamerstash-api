import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { ddbDocClient } from '../config/db.js'; // Import our DynamoDB client
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'; // Import DynamoDB commands
import crypto from 'crypto'; // Import the built-in crypto module for UUIDs

/**
 * @function registerUser
 * @description Registers a new user by validating input, checking for existing users, hashing the password,
 *              saving the user to DynamoDB, and returning a JWT.
 * @param {Object} req - Express request object containing the user input in `req.body`.
 * @param {Object} res - Express response object used to send the response.
 * @returns {void}
 */
export const registerUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // 1. Check if user with that email already exists
        const getParams = {
            TableName: "Users",
            Key: {
                email: email,
            },
        };

        const { Item } = await ddbDocClient.send(new GetCommand(getParams));

        if (Item) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // 2. Hash the password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS);
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create the new user object with a unique ID and default role
        const newUser = {
            id: crypto.randomUUID(),
            email: email,
            password: hashedPassword,
            roles: ["customer"], // Add this line
            createdAt: new Date().toISOString(),
        };

        // 4. Save the new user to the DynamoDB table
        const putParams = {
            TableName: "Users",
            Item: newUser,
        };

        await ddbDocClient.send(new PutCommand(putParams));
        console.log("User successfully saved to DynamoDB:", newUser.email);

        // 5. Create and return JWT
        const payload = {
            user: {
                id: newUser.id,
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
        console.error("Error in registerUser:", err);
        res.status(500).send('Server Error');
    }
};

/**
 * @function loginUser
 * @description Authenticates a user by validating input, checking credentials, and returning a JWT if valid.
 * @param {Object} req - Express request object containing the user input in `req.body`.
 * @param {Object} res - Express response object used to send the response.
 * @returns {void}
 */
export const loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
    }

    const {email, password} = req.body;

    try {
        // 1. Check if user exists
        const getParams = {
            TableName: "Users",
            Key: {
                email: email,
            },
        };

        const {Item} = await ddbDocClient.send(new GetCommand(getParams));

        if (!Item) {
            // Important: Use a generic error message for security
            return res.status(400).json({msg: 'Invalid Credentials'});
        }

        // 2. Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, Item.password);

        if (!isMatch) {
            return res.status(400).json({msg: 'Invalid Credentials'});
        }

        // 3. User is valid, create and return a new JWT
        const payload = {
            user: {
                id: Item.id, // Use the user's ID from the database
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES_IN},
            (err, token) => {
                if (err) throw err;
                res.json({token});
            }
        );

    } catch (err) {
        console.error("Error in loginUser:", err);
        res.status(500).send('Server Error');
    }
};

export const getMe = async (req, res) => {
    try {
        // The full user object, fetched by the authMiddleware, is already on req.user
        const user = req.user;

        // Don't send the password back
        delete user.password;

        res.json(user);

    } catch (err) {
        console.error("Error in getMe:", err);
        res.status(500).send('Server Error');
    }
};