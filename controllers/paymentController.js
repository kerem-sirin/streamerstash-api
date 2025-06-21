import Stripe from 'stripe';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../config/db.js';

// @desc    Create a Stripe Payment Intent for an order
// @route   POST /api/payments/create-intent
// @access  Private
export const createPaymentIntent = async (req, res) => {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
        return res.status(400).json({ msg: 'Order ID is required' });
    }

    try {
        // This ensures process.env.STRIPE_SECRET_KEY is loaded before Stripe is initialized.
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // 1. Get the order from your database to verify the amount and ownership
        const orderParams = {
            TableName: 'Orders',
            Key: {
                id: orderId,
                userId: userId,
            },
        };
        const { Item: order } = await ddbDocClient.send(new GetCommand(orderParams));

        if (!order) {
            return res.status(404).json({ msg: 'Order not found or you do not have permission' });
        }

        if (order.status !== 'pending_payment') {
            return res.status(400).json({ msg: `Order has already been processed. Status: ${order.status}` });
        }

        // 2. Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: order.totalAmount, // Amount in the smallest currency unit (cents)
            currency: 'gbp', // Use 'gbp' for British Pounds
            // In the latest version of the API, you must specify 'automatic_payment_methods'.
            automatic_payment_methods: {
                enabled: true,
            },
            // Add metadata to link this Stripe payment to your order
            metadata: {
                orderId: order.id,
                userId: userId,
            },
        });

        // 3. (Optional but recommended) Save the paymentIntent.id to your order
        const updateParams = {
            TableName: 'Orders',
            Key: { id: orderId, userId: userId },
            UpdateExpression: 'SET #pi = :pi',
            ExpressionAttributeNames: { '#pi': 'paymentIntentId' },
            ExpressionAttributeValues: { ':pi': paymentIntent.id }
        };
        await ddbDocClient.send(new UpdateCommand(updateParams));

        // 4. Send the client secret back to the frontend
        // The frontend will use this to confirm the payment
        res.send({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (err) {
        console.error("Error creating payment intent:", err);
        res.status(500).send('Server Error');
    }
};