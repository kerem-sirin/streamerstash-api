import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// The AWS SDK will automatically look for the region and credentials
// in ~/.aws/config and ~/.aws/credentials files.
// We don't need to expose the region here.
const ddbClient = new DynamoDBClient({});

// Create a DynamoDB Document Client
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Export the client for use in other files
export { ddbDocClient };