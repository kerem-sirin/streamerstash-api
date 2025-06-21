import { GetCommand, PutCommand, BatchGetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../config/db.js';
import crypto from 'crypto';

// @desc    Create a new order from the user's cart
// @route   POST /api/orders
// @access  Private
export const createOrderFromCart = async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Get the user's cart
        const cartParams = { TableName: 'Carts', Key: { userId } };
        const { Item: cart } = await ddbDocClient.send(new GetCommand(cartParams));

        if (!cart || !cart.items || cart.items.size === 0) {
            return res.status(400).json({ msg: 'Cart is empty' });
        }

        // 2. Fetch details for all products in the cart using BatchGetCommand for efficiency
        const productKeys = Array.from(cart.items).map(productId => ({ id: productId }));

        const productsParams = {
            RequestItems: {
                'Products': {
                    Keys: productKeys,
                    // Specify which attributes to retrieve
                    ProjectionExpression: 'id, #n, price',
                    ExpressionAttributeNames: {'#n': 'name'}
                }
            }
        };

        const { Responses } = await ddbDocClient.send(new BatchGetCommand(productsParams));
        const productDetails = Responses['Products'];

        if (productDetails.length !== cart.items.size) {
            return res.status(400).json({ msg: 'One or more products in the cart could not be found.' });
        }

        // 3. Calculate total amount and prepare order items
        let totalAmount = 0;
        const orderItems = productDetails.map(product => {
            totalAmount += product.price;
            return {
                productId: product.id,
                name: product.name,
                price: product.price // Price at the time of order
            };
        });

        // 4. Create the new order object
        const orderId = `ord_${crypto.randomUUID()}`;
        const newOrder = {
            id: orderId,
            userId: userId,
            items: orderItems,
            totalAmount: totalAmount,
            status: 'pending_payment', // The next step will be payment processing
            createdAt: new Date().toISOString(),
        };

        // 5. Save the new order to the Orders table
        const orderPutParams = { TableName: 'Orders', Item: newOrder };
        await ddbDocClient.send(new PutCommand(orderPutParams));

        // 6. Clear the user's cart
        const cartDeleteParams = { TableName: 'Carts', Key: { userId } };
        await ddbDocClient.send(new DeleteCommand(cartDeleteParams));

        // 7. Return the new order to the client
        res.status(201).json(newOrder);

    } catch (err) {
        console.error("Error creating order:", err);
        res.status(500).send('Server Error');
    }
};