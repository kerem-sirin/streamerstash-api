﻿import { PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'; // Add ScanCommand and GetCommand
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

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Owner or Admin)
export const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const user = req.user; // User object from authMiddleware
        const { name, description, price, category, tags } = req.body;

        // 1. Fetch the product to check for existence and ownership
        const getParams = {
            TableName: 'Products',
            Key: { id: productId },
        };
        const { Item: product } = await ddbDocClient.send(new GetCommand(getParams));

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // 2. Check permissions: User must be the product's artist or an admin
        const hasPermission = product.artistId === user.id || user.roles.includes('admin');
        if (!hasPermission) {
            return res.status(403).json({ msg: 'Forbidden: You do not have permission to update this product' });
        }

        // 3. Build the update expression for DynamoDB dynamically
        const updateExpressionParts = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        // Helper function to add updates if the value exists in the request
        const addUpdate = (key, value, attributeName, attributeValue) => {
            if (value !== undefined) {
                updateExpressionParts.push(`${key} = ${attributeValue}`);
                expressionAttributeNames[key] = attributeName;
                expressionAttributeValues[attributeValue] = value;
            }
        };

        addUpdate('#n', name, 'name', ':n');
        addUpdate('#d', description, 'description', ':d');
        addUpdate('#p', price, 'price', ':p');
        addUpdate('#c', category, 'category', ':c');
        addUpdate('#t', tags, 'tags', ':t');

        // Always update the 'updatedAt' timestamp
        updateExpressionParts.push('#ua = :ua');
        expressionAttributeNames['#ua'] = 'updatedAt';
        expressionAttributeValues[':ua'] = new Date().toISOString();

        // If no fields were provided to update, return an error.
        if (updateExpressionParts.length <= 1) {
            return res.status(400).json({ msg: 'No valid fields provided for update' });
        }

        const updateParams = {
            TableName: 'Products',
            Key: { id: productId },
            UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW', // Return the item as it appears after the update
        };

        const { Attributes: updatedProduct } = await ddbDocClient.send(new UpdateCommand(updateParams));

        res.json(updatedProduct);

    } catch (err) {
        console.error("Error updating product:", err);
        res.status(500).send('Server Error');
    }
};

/// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Owner or Admin)
export const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const user = req.user;

        // 1. Fetch the product to check for existence and ownership
        const getParams = {
            TableName: 'Products',
            Key: { id: productId },
        };
        const { Item: product } = await ddbDocClient.send(new GetCommand(getParams));

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // 2. Check permissions
        const hasPermission = product.artistId === user.id || user.roles.includes('admin');
        if (!hasPermission) {
            return res.status(403).json({ msg: 'Forbidden: You do not have permission to delete this product' });
        }

        // 3. Delete the product
        const deleteParams = {
            TableName: 'Products',
            Key: { id: productId },
        };
        await ddbDocClient.send(new DeleteCommand(deleteParams));

        // Note: In a real app, you would also delete the associated files from S3 here.

        res.json({ msg: 'Product removed successfully' });

    } catch (err) {
        console.error("Error deleting product:", err);
        res.status(500).send('Server Error');
    }
};

// @desc    Link an uploaded S3 asset key to a product
// @route   PUT /api/products/:id/asset
// @access  Private (Owner or Admin)
export const linkAssetToProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const user = req.user;
        const { s3AssetKey } = req.body;

        if (!s3AssetKey) {
            return res.status(400).json({ msg: 's3AssetKey is required' });
        }

        // Fetch the product to verify ownership
        const getParams = {
            TableName: 'Products',
            Key: { id: productId },
        };
        const { Item: product } = await ddbDocClient.send(new GetCommand(getParams));

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        // Check permissions
        if (product.artistId !== user.id && !user.roles.includes('admin')) {
            return res.status(403).json({ msg: 'Forbidden: You do not have permission' });
        }

        // Update the product with the new S3 key
        const updateParams = {
            TableName: 'Products',
            Key: { id: productId },
            UpdateExpression: 'SET #s3Key = :s3Key, #ua = :ua',
            ExpressionAttributeNames: {
                '#s3Key': 's3AssetKey',
                '#ua': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':s3Key': s3AssetKey,
                ':ua': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW',
        };

        const { Attributes: updatedProduct } = await ddbDocClient.send(new UpdateCommand(updateParams));
        res.json(updatedProduct);

    } catch (err) {
        console.error("Error linking asset:", err);
        res.status(500).send("Server Error");
    }
};

// @desc    Add a preview image S3 key to a product's list
// @route   POST /api/products/:id/previews
// @access  Private (Owner or Admin)
export const addPreviewImage = async (req, res) => {
    try {
        const productId = req.params.id;
        const user = req.user;
        const { previewImageKey } = req.body;

        if (!previewImageKey) {
            return res.status(400).json({ msg: 'previewImageKey is required' });
        }

        const getParams = { TableName: 'Products', Key: { id: productId } };
        const { Item: product } = await ddbDocClient.send(new GetCommand(getParams));

        if (!product) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        if (product.artistId !== user.id && !user.roles.includes('admin')) {
            return res.status(403).json({ msg: 'Forbidden: You do not have permission' });
        }

        // This expression appends the new key to the previewImageKeys list.
        // If the list doesn't exist, it creates it first.
        const updateParams = {
            TableName: 'Products',
            Key: { id: productId },
            UpdateExpression: 'SET #previewKeys = list_append(if_not_exists(#previewKeys, :empty_list), :new_key)',
            ExpressionAttributeNames: { '#previewKeys': 'previewImageKeys' },
            ExpressionAttributeValues: {
                ':new_key': [previewImageKey], // The item to append must be in a list
                ':empty_list': [],
            },
            ReturnValues: 'ALL_NEW',
        };

        const { Attributes: updatedProduct } = await ddbDocClient.send(new UpdateCommand(updateParams));
        res.json(updatedProduct);

    } catch (err) {
        console.error("Error adding preview image:", err);
        res.status(500).send("Server Error");
    }
};