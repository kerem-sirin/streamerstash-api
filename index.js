import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import productRoutes from './routes/products.js';
import uploadRoutes from './routes/uploads.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';

// Initialize dotenv to load environment variables
dotenv.config();

// Create an instance of express
const app = express();
const port = process.env.PORT;

// Middleware to handle CORS issues
app.use(cors());

// IMPORTANT: We need to use express.raw for the webhook route BEFORE express.json()
// This ensures we get the raw request body needed for Stripe's signature verification.
// All other routes will still use express.json().
app.use(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' })
);

// This will now apply to all routes EXCEPT the webhook route defined above.
app.use(express.json());

// Define a simple root route to confirm the server is running
app.get("/", (req, res) => {
    res.send("Hello there! Welcome to the Streamer Stash World!");
});

// Tell the app to use the auth routes for any URL starting with /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})