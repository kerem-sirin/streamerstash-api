import Stripe from 'stripe';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../config/db.js';

// @desc    Create or retrieve a Stripe Payment Intent for an order
// @route   POST /api/payments/create-intent
// @access  Private
export const createPaymentIntent = async (req, res) => {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
        return res.status(400).json({ msg: 'Order ID is required' });
    }

    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // 1. Get the order from your database
        const orderParams = {
            TableName: 'Orders',
            Key: { id: orderId, userId: userId },
        };
        const { Item: order } = await ddbDocClient.send(new GetCommand(orderParams));

        if (!order) {
            return res.status(404).json({ msg: 'Order not found or you do not have permission' });
        }
        if (order.status !== 'pending_payment') {
            return res.status(400).json({ msg: `Order has already been processed. Status: ${order.status}` });
        }

        let paymentIntent;

        // 2. Check if a Payment Intent already exists for this order
        if (order.paymentIntentId) {
            // If it exists, retrieve it from Stripe
            paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
        } else {
            // If not, create a new one
            paymentIntent = await stripe.paymentIntents.create({
                amount: order.totalAmount,
                currency: 'gbp',
                automatic_payment_methods: { enabled: true },
                // CORRECTED: The return_url parameter is removed from this call
                // as it's only needed when confirming the payment on the client side.
                metadata: {
                    orderId: order.id,
                    userId: userId,
                },
            });

            // Save the new paymentIntent.id to your order in DynamoDB
            const updateParams = {
                TableName: 'Orders',
                Key: { id: orderId, userId: userId },
                UpdateExpression: 'SET #pi = :pi',
                ExpressionAttributeNames: { '#pi': 'paymentIntentId' },
                ExpressionAttributeValues: { ':pi': paymentIntent.id }
            };
            await ddbDocClient.send(new UpdateCommand(updateParams));
        }

        // 3. Send the client secret for the existing or new Payment Intent
        res.send({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (err) {
        console.error("Error creating/retrieving payment intent:", err);
        res.status(500).send('Server Error');
    }
};

// @desc    Handle incoming webhook events from Stripe
// @route   POST /api/payments/webhook
// @access  Public (but verified by Stripe signature)
export const handleStripeWebhook = async (req, res) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.log(`Webhook signature verification failed.`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);

        const { orderId, userId } = paymentIntent.metadata;

        try {
            const updateParams = {
                TableName: 'Orders',
                Key: { id: orderId, userId: userId },
                UpdateExpression: 'SET #status = :status',
                ExpressionAttributeNames: { '#status': 'status' },
                ExpressionAttributeValues: { ':status': 'completed' },
            };
            await ddbDocClient.send(new UpdateCommand(updateParams));
            console.log(`Order ${orderId} status updated to completed.`);
        } catch (dbError) {
            console.error('Failed to update order status:', dbError);
        }
    } else {
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
};
