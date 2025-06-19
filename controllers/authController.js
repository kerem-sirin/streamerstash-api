import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { ddbDocClient } from '../config/db.js'; // Import our DynamoDB client
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'; // Import DynamoDB commands
import crypto from 'crypto'; // Import the built-in crypto module for UUIDs

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

        // 3. Create the new user object with a unique ID
        const newUser = {
            id: crypto.randomUUID(), // Generate a true unique ID
            email: email,
            password: hashedPassword,
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