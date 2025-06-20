
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient } from '../config/db.js';

// @desc    Get the current user's shopping cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const params = {
            TableName: 'Carts',
            Key: { userId },
        };

        const { Item } = await ddbDocClient.send(new GetCommand(params));

        if (!Item) {
            // If a user has no cart yet, return an empty one.
            return res.json({ userId, items: [], updatedAt: null });
        }

        // Convert Set to Array before sending response
        if (Item.items instanceof Set) {
            Item.items = [...Item.items];
        }

        res.json(Item);

    } catch (err) {
        console.error("Error fetching cart:", err);
        res.status(500).send('Server Error');
    }
};

// @desc    Add an item to the shopping cart
// @route   POST /api/cart/items
// @access  Private
export const addItemToCart = async (req, res) => {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) {
        return res.status(400).json({ msg: 'Product ID is required' });
    }

    try {
        const params = {
            TableName: 'Carts',
            Key: { userId },
            UpdateExpression: 'ADD #items :productId SET #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#items': 'items',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':productId': new Set([productId]),
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW',
        };

        const { Attributes: updatedCart } = await ddbDocClient.send(new UpdateCommand(params));

        // Convert Set to Array before sending response
        if (updatedCart.items instanceof Set) {
            updatedCart.items = [...updatedCart.items];
        }

        res.json(updatedCart);

    } catch (err) {
        console.error("Error adding item to cart:", err);
        res.status(500).send('Server Error');
    }
};

// @desc    Remove an item from the shopping cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
export const removeItemFromCart = async (req, res) => {
    const { productId } = req.params; // Get productId from URL parameter
    const userId = req.user.id;

    try {
        const params = {
            TableName: 'Carts',
            Key: { userId },
            UpdateExpression: 'DELETE #items :productId SET #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#items': 'items',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':productId': new Set([productId]),
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW',
        };

        const { Attributes: updatedCart } = await ddbDocClient.send(new UpdateCommand(params));

        const responseCart = updatedCart || { userId, items: [], updatedAt: new Date().toISOString() };

        // Convert Set to Array before sending response
        if (responseCart.items instanceof Set) {
            responseCart.items = [...responseCart.items];
        }

        res.json(responseCart);

    } catch (err) {
        console.error("Error removing item from cart:", err);
        res.status(500).send('Server Error');
    }
};