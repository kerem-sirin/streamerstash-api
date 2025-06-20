import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from 'crypto';

// Initialize the S3 Client. It will use the credentials and region from your environment.
const s3Client = new S3Client({});

// @desc    Get a pre-signed URL for uploading a file (asset or preview)
// @route   POST /api/uploads/url
// @access  Private (Artists, Admins)
export const getUploadUrl = async (req, res) => {
    // The artist's user ID from the authenticated request
    const artistId = req.user.id;
    // The product ID this asset will be associated with
    const { productId, fileType, uploadType } = req.body; // uploadType can be 'asset' or 'preview'

    if (!productId || !fileType || !uploadType) {
        return res.status(400).json({ msg: 'Product ID, file type, and upload type are required' });
    }

    try {
        // Generate a unique file name to prevent conflicts
        const randomId = crypto.randomUUID();
        const fileExtension = fileType.split('/')[1] || 'zip'; // e.g., 'image/png' -> 'png'

        // Construct a unique key (path) for the file in the S3 bucket
        const key = `${uploadType}s/${artistId}/${productId}/${randomId}.${fileExtension}`; // e.g., previews/... or assets/...

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
            ContentType: fileType,
        });

        // Generate the pre-signed URL, which will be valid for a short time (e.g., 5 minutes)
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        res.json({
            uploadUrl: uploadUrl,
            key: key, // Send the key back so we can save it to the product in the database
        });

    } catch (err) {
        console.error("Error generating pre-signed URL:", err);
        res.status(500).send("Server Error");
    }
};
