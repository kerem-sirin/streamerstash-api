import { PutCommand, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb'; // Add ScanCommand and GetCommand
import { ddbDocClient } from '../config/db.js';
import crypto from 'crypto';

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (Artists, Admins)
export const createProduct = async (req, res) => {
    // Note: We'll add input validation in a later step
    const {
        name,
        description,
        price,
        category,
        tags
    } = req.body;

    // The user's ID is attached to the request by the authMiddleware
    const artistId = req.user.id;

    try {
        const productId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const newProduct = {
            id: productId, // e.g.,"a1b2c3d4-e5f6-7890-1234-567890abcdef"
            artistId: artistId, // e.g.,"81ce8996-74a8-4854-84ad-99458f945714"
            name, // e.g., "Cyberpunk Stream Overlay Kit"
            description, // e.g., "A complete animated overlay pack with webcam..."
            price, // Expecting price in cents (e.g., 1500 for $15.00)
            category, // e.g., "Overlay UI Packs"
            tags: tags || [], // Default to an empty array if no tags are provided, e.g., ["animated", "cyberpunk", "neon", "futuristic"]
            status: 'pending_approval', // All new products require admin approval, e.g.,"published", "pending_approval", "rejected"
            previewImageKeys: [], // Will be updated later
            s3AssetKey: '',      // Will be updated later
            createdAt: timestamp, // ISO 8601 format, e.g.,"2023-10-01T12:00:00.000Z"
            updatedAt: timestamp, // ISO 8601 format, e.g.,"2025-06-20T12:00:00.000Z"
            version: 1,
        };

        const params = {
            TableName: 'Products',
            Item: newProduct,
        };

        await ddbDocClient.send(new PutCommand(params));

        res.status(201).json(newProduct);

    } catch (err) {
        console.error("Error creating product:", err);
        res.status(500).send('Server Error');
    }
};

// @desc    Fetch all published products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
    // Extract query parameters from the request URL
    const { category, tag, sortBy, order = 'desc', limit = 10, lastKey } = req.query;

    let params = {
        TableName: 'Products',
        // Use the new GSI for efficient querying
        IndexName: 'status-createdAt-index',
        // Query for items where the status is 'published'
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: {
            ':status': 'published',
        },
        Limit: parseInt(limit),
        // Sort in descending order (newest first) by default
        ScanIndexForward: order === 'asc' ? true : false,
    };

    // --- Filtering Logic ---
    let filterExpressions = [];

    if (category) {
        filterExpressions.push('#category = :category');
        params.ExpressionAttributeNames['#category'] = 'category';
        params.ExpressionAttributeValues[':category'] = category;
    }

    if (tag) {
        filterExpressions.push('contains(#tags, :tag)');
        params.ExpressionAttributeNames['#tags'] = 'tags';
        params.ExpressionAttributeValues[':tag'] = tag;
    }

    if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
    }

    // --- Pagination Logic ---
    if (lastKey) {
        // If lastKey is provided, decode it and use it to start the next page
        params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString('utf8'));
    }

    try {
        // Use a QueryCommand now instead of Scan for efficiency
        const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
        const { Items, LastEvaluatedKey } = await ddbDocClient.send(new QueryCommand(params));

        // Encode the LastEvaluatedKey for the client to use in the next request
        const nextKey = LastEvaluatedKey
            ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64')
            : null;

        res.json({
            items: Items,
            nextKey: nextKey // The key for the next page
        });

    } catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).send('Server Error');
    }
};

// @desc    Fetch a single product by its ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
    try {
        const params = {
            TableName: 'Products',
            Key: {
                id: req.params.id, // Get the ID from the URL parameter
            },
        };

        const { Item } = await ddbDocClient.send(new GetCommand(params));

        if (Item) {
            res.json(Item);
        } else {
            res.status(404).json({ msg: 'Product not found' });
        }

    } catch (err) {
        console.error("Error fetching product by ID:", err);
        res.status(500).send('Server Error');
    }
};