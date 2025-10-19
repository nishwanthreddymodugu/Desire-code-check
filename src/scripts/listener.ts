import {
    SQSClient,
    GetQueueUrlCommand,
    ReceiveMessageCommand,
    DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import axios from "axios";
import createLogger from "../config/logger";
import * as dotenv from "dotenv";
const logger = createLogger(module);

dotenv.config();

const queueName = process.env.IMAGE_GEN_QUEUE;
const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
const flaskApiEndpoint = process.env.FLASK_API_ENDPOINT;
const PICASSO_TOKEN = process.env.PICASSO_TOKEN;

if (!queueName) {
    throw new Error(
        "CRITICAL ERROR: Environment variable 'IMAGE_GEN_QUEUE' is not defined."
    );
}
if (!backendBaseUrl) {
    throw new Error(
        "CRITICAL ERROR: Environment variable 'BACKEND_API_BASE_URL' is not defined."
    );
}
if (!flaskApiEndpoint) {
    throw new Error(
        "CRITICAL ERROR: Environment variable 'FLASK_API_ENDPOINT' is not defined."
    );
}
if (!PICASSO_TOKEN) {
    throw new Error(
        "CRITICAL ERROR: Environment variable 'PICASSO_TOKEN' is not defined."
    );
}

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_SQS_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const retryRequest = async (
    fn: () => Promise<any>,
    retries = 3,
    delayMs = 1000,
    context = "unknown"
): Promise<any> => {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn();
        } catch (err: any) {
            attempt++;
            const errorMessage = err.response
                ? JSON.stringify(err.response.data)
                : err.message;
            logger.warn(
                `⚠️ [${context}] Attempt ${attempt} failed: ${errorMessage}. Retrying in ${delayMs}ms...`
            );
            if (attempt === retries) {
                logger.error(`❌ [${context}] All ${retries} attempts failed.`);
                throw err; // Re-throw the final error
            }
            await sleep(delayMs);
            delayMs *= 2;
        }
    }
};

const resolveQueueUrl = async (): Promise<string> => {
    try {
        const { QueueUrl } = await sqsClient.send(
            new GetQueueUrlCommand({ QueueName: queueName })
        );
        if (!QueueUrl) throw new Error("Queue URL not returned by AWS SQS.");
        return QueueUrl;
    } catch (err: any) {
        logger.error(`❌ Failed to resolve queue URL: ${err.message}`);
        throw err;
    }
};

// Main polling loop
const pollQueue = async (queueUrl: string): Promise<void> => {
    logger.info(`🚀 Listening for messages on queue '${queueName}'...`);

    while (true) {
        try {
            const { Messages } = await sqsClient.send(
                new ReceiveMessageCommand({
                    QueueUrl: queueUrl,
                    MaxNumberOfMessages: 1,
                    WaitTimeSeconds: 20,
                    VisibilityTimeout: 60,
                })
            );
            if (!Messages || Messages.length === 0) continue;

            for (const message of Messages) {
                const body = message.Body ?? "";
                logger.info(`📩 Received SQS message: ${body}`);

                let job: any = {};
                let finalStatus: "Completed" | "cancelled" = "cancelled";

                try {
                    job = JSON.parse(body);
                    const { request_id, campaign_id } = job;

                    if (!request_id || !campaign_id) {
                        throw new Error(
                            "Invalid SQS message: missing request_id or campaign_id"
                        );
                    }

                    // Step 1: Fetch request details from backend
                    try {
                        const getDetailsUrl = `${backendBaseUrl}/api/v1/campaign/${campaign_id}/image/requests/${request_id}/get`;
                        logger.info(
                            `🔍 Fetching job details from: ${getDetailsUrl}`
                        );

                        const detailsResponse = await retryRequest(
                            () => {
                                console.log("headers:", {
                                    "x-picasso-auth": PICASSO_TOKEN,
                                });
                                return axios.get(getDetailsUrl, {
                                    headers: {
                                        "x-picasso-auth": PICASSO_TOKEN,
                                    },
                                });
                            },
                            3,
                            1000,
                            "fetch-details"
                        );

                        if (!detailsResponse || !detailsResponse.data) {
                            throw new Error(
                                `No data found for request_id ${request_id}`
                            );
                        }
                        const fullJobDetails = detailsResponse.data;

                        // Step 2: Send to Flask API
                        try {
                            logger.info(
                                `🧠 Sending job to Flask API at ${flaskApiEndpoint}`
                            );
                            const flaskResponse = await retryRequest(
                                () =>
                                    axios.post(
                                        flaskApiEndpoint,
                                        fullJobDetails,
                                        { timeout: 60000 }
                                    ),
                                2,
                                2000,
                                "flask-api"
                            );
                            if (flaskResponse && flaskResponse.data) {
                                logger.info(
                                    `✅ Flask job processed successfully for request ${request_id}`
                                );
                                finalStatus = "Completed";
                            } else {
                                logger.warn(
                                    `⚠️ Flask returned no response for request ${request_id}`
                                );
                            }
                        } catch (flaskErr: any) {
                            logger.error(
                                `❌ Error sending job to Flask API: ${flaskErr.message}`
                            );
                        }
                    } catch (detailsErr: any) {
                        logger.error(
                            `❌ Error fetching job details: ${detailsErr.message}`
                        );
                    }
                } catch (jobErr: any) {
                    logger.error(`💥 Job processing failed: ${jobErr.message}`);
                }

                // Step 3: Update final status, INCLUDING the secret token.
                try {
                    if (job.request_id && job.campaign_id) {
                        const updateUrl = `${backendBaseUrl}/api/v1/campaign/${job.campaign_id}/image/requests/${job.request_id}/update-status`;
                        const statusToSend = finalStatus.toLowerCase();

                        await retryRequest(
                            () =>
                                axios.put(
                                    updateUrl,
                                    { new_status: statusToSend },
                                    {
                                        headers: {
                                            "x-picasso-auth": PICASSO_TOKEN,
                                        },
                                    }
                                ),
                            3,
                            1000,
                            "update-status"
                        );
                        logger.info(
                            `📦 Updated request ${job.request_id} -> ${finalStatus}`
                        );
                    }
                } catch (updateErr: any) {
                    logger.error(
                        `❌ Failed to update status for request ${job.request_id}: ${updateErr.message}`
                    );
                }

                // Step 4: Always delete the message after processing (success or failure)
                try {
                    if (message.ReceiptHandle) {
                        await sqsClient.send(
                            new DeleteMessageCommand({
                                QueueUrl: queueUrl,
                                ReceiptHandle: message.ReceiptHandle,
                            })
                        );
                        logger.info(
                            `🗑️ Deleted message for request ${job.request_id} from SQS.`
                        );
                    }
                } catch (deleteErr: any) {
                    logger.error(
                        `❌ Failed to delete message from SQS: ${deleteErr.message}`
                    );
                }
            }
        } catch (pollErr: any) {
            logger.error(`🔁 Polling error: ${pollErr.message}`);
            await sleep(5000);
        }
    }
};

const start = async () => {
    try {
        const queueUrl = await resolveQueueUrl();
        await pollQueue(queueUrl);
    } catch (err: any) {
        logger.error(`💥 Listener crashed: ${err.message}`);
        process.exit(1);
    }
};

start();
