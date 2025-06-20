import jwt from 'jsonwebtoken';
import { ddbDocClient } from '../config/db.js';
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

// Middleware to fetch the full user profile
export const authMiddleware = async (req, res, next) => {
    // 1. Get token from header
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;

        // 3. Fetch the full user profile from DynamoDB using the ID from the token
        const params = {
            TableName: "Users",
            // Note: A Scan is inefficient. We will fix this later with a Global Secondary Index (GSI).
            FilterExpression: "id = :id",
            ExpressionAttributeValues: { ":id": userId }
        };

        const { Items } = await ddbDocClient.send(new ScanCommand(params));

        if (!Items || Items.length === 0) {
            return res.status(401).json({ msg: 'Token is not valid, user not found' });
        }

        // 4. Attach the full user object (including roles) to the request object
        req.user = Items[0];

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Middleware for Role-Based Authorization
export const authorize = (allowedRoles) => {
    return (req, res, next) => {
        // We'll check for the user and an empty roles array as a fallback
        const userRoles = req.user?.roles || []; // Use Optional Chaining (?.) and default to an empty array

        const hasPermission = userRoles.some(role => allowedRoles.includes(role));

        if (hasPermission) {
            next();
        } else {
            // This is the error we expect for non-admins
            return res.status(403).json({ msg: 'Forbidden: You do not have the required permissions' });
        }
    };
};