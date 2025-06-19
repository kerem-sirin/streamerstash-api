import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

// Initialize dotenv to load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT;

// Add middleware to parse JSON request bodies
app.use(express.json());

// Define a simple root route to confirm the server is running
app.get("/", (req, res) => {
    res.send("Hello there! Welcome to the Streamer Stash World!");
});

// Tell the app to use the auth routes for any URL starting with /api/auth
app.use('/api/auth', authRoutes);

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})