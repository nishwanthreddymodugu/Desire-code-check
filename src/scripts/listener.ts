import { config as loadEnv } from "dotenv";
import {
    DeleteMessageCommand,
    GetQueueUrlCommand,
    ReceiveMessageCommand,
    SQSClient,
    type SQSClientConfig,
} from "@aws-sdk/client-sqs";
import createLogger from "../config/logger";

loadEnv();

const logger = createLogger(module);
const queueName = process.env.IMAGE_GEN_QUEUE;

if (!queueName) {
    logger.error("IMAGE_GEN_QUEUE environment variable is not set.");
    process.exit(1);
}

const sqsConfig: SQSClientConfig = {};

if (process.env.AWS_REGION) {
    sqsConfig.region = process.env.AWS_REGION;
}

if (process.env.AWS_SQS_ENDPOINT) {
    sqsConfig.endpoint = process.env.AWS_SQS_ENDPOINT;
}

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    sqsConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
    };
}

const sqsClient = new SQSClient(sqsConfig);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveQueueUrl = async () => {
    const response = await sqsClient.send(
        new GetQueueUrlCommand({
            QueueName: queueName,
            QueueOwnerAWSAccountId: process.env.AWS_ACCOUNT_ID,
        })
    );

    if (!response.QueueUrl) {
        throw new Error("Queue URL not returned by AWS SQS.");
    }

    return response.QueueUrl;
};

const pollQueue = async (queueUrl: string): Promise<void> => {
    logger.info(`Listening for messages on queue '${queueName}'.`);

    while (true) {
        try {
            const response = await sqsClient.send(
                new ReceiveMessageCommand({
                    QueueUrl: queueUrl,
                    MaxNumberOfMessages: 1,
                    WaitTimeSeconds: 20,
                    VisibilityTimeout: 30,
                })
            );

            const messages = response.Messages ?? [];

            if (!messages.length) {
                continue;
            }

            for (const message of messages) {
                const body = message.Body ?? "";
                logger.info(`Received message: ${body}`);

                // Add logic to handle the queue message

                if (message.ReceiptHandle) {
                    await sqsClient.send(
                        new DeleteMessageCommand({
                            QueueUrl: queueUrl,
                            ReceiptHandle: message.ReceiptHandle,
                        })
                    );
                }
            }
        } catch (error) {
            const err = error as Error;
            logger.error(`Error while polling queue: ${err.message}`);
            await sleep(5000);
        }
    }
};

const start = async () => {
    try {
        const queueUrl = await resolveQueueUrl();
        await pollQueue(queueUrl);
    } catch (error) {
        const err = error as Error;
        logger.error(`Listener failed to start: ${err.message}`);
        process.exit(1);
    }
};

start();
