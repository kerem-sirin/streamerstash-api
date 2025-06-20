import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    // 1. Get token from the request header
    const token = req.header('x-auth-token');

    // 2. Check if no token is provided
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // 3. Verify the token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the user's information to the request object
        req.user = decoded.user;

        // Call the next middleware or route handler
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

export default authMiddleware;