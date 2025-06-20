import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * The base DynamoDB client.
 * The AWS SDK automatically discovers credentials and region from the environment.
 * An empty configuration object `{}` is passed to use the default configuration chain.
 * @const {DynamoDBClient}
 */
const ddbClient = new DynamoDBClient({});

/**
 * The DynamoDB Document Client.
 * This client simplifies interaction with DynamoDB by abstracting away the low-level
 * DynamoDB data types and allowing the use of native JavaScript objects.
 * @const {DynamoDBDocumentClient}
 */
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * Export the configured DynamoDB Document Client for use in other modules.
 * @exports ddbDocClient
 */
export { ddbDocClient };