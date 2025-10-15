import { config as loadEnv } from "dotenv";
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SQSClient,
  type SQSClientConfig,
} from "@aws-sdk/client-sqs";
import axios from "axios";
import createLogger from "../config/logger";

loadEnv();

const logger = createLogger(module);

// Environment setup
const queueName = process.env.IMAGE_GEN_QUEUE;
const backendBaseUrl = process.env.BACKEND_API_BASE_URL || "http://localhost:8081";
const flaskApiEndpoint = process.env.FLASK_API_ENDPOINT || "http://localhost:5000/api/v1/picasso/generate";

if (!queueName || !flaskApiEndpoint) {
  logger.error("❌ Missing environment variables: IMAGE_GEN_QUEUE or FLASK_API_ENDPOINT");
  process.exit(1);
}

// SQS client setup
const sqsConfig: SQSClientConfig = {};
if (process.env.AWS_REGION) sqsConfig.region = process.env.AWS_REGION;
if (process.env.AWS_SQS_ENDPOINT) sqsConfig.endpoint = process.env.AWS_SQS_ENDPOINT;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  sqsConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}
const sqsClient = new SQSClient(sqsConfig);

// Utility: delay between retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry wrapper for API calls
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
      logger.warn(
        `⚠️ [${context}] Attempt ${attempt} failed: ${err.message || err}. Retrying in ${delayMs}ms...`
      );
      if (attempt === retries) {
        logger.error(`❌ [${context}] All ${retries} attempts failed.`);
        return null;
      }
      await sleep(delayMs);
      delayMs *= 2; // exponential backoff
    }
  }
};

// Resolve SQS queue URL
const resolveQueueUrl = async (): Promise<string | null> => {
  try {
    const response = await sqsClient.send(new GetQueueUrlCommand({ QueueName: queueName }));
    if (!response.QueueUrl) throw new Error("Queue URL not returned by AWS SQS.");
    return response.QueueUrl;
  } catch (err: any) {
    logger.error(`❌ Failed to resolve SQS queue URL: ${err.message}`);
    return null;
  }
};

// Main polling loop
const pollQueue = async (queueUrl: string): Promise<void> => {
  logger.info(`🚀 Listening for messages on queue '${queueName}'...`);

  while (true) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 60,
        })
      );

      const messages = response.Messages ?? [];
      if (!messages.length) continue;

      for (const message of messages) {
        const body = message.Body ?? "";
        logger.info(`📩 Received SQS message: ${body}`);

        let job: any = {};
        let finalStatus: "Completed" | "Failed" = "Failed";
        
        try {
          // Parse SQS body
          job = JSON.parse(body);
          console.log(job);

        if(!job.request_id || !job.campaign_id) {
            logger.error("❌ Invalid SQS message: missing request_id or campaign_id");
        
            // Delete the invalid message from SQS
            await sqsClient.send(
                new DeleteMessageCommand({
                    QueueUrl: queueUrl, 
                    ReceiptHandle: message.ReceiptHandle,
                })
            );
            logger.info("🗑️ Deleted invalid message from SQS.");
        
            continue;
        }
        //   if (!job.request_id || !job.campaign_id) {
        //     logger.error("❌ Invalid SQS message: missing request_id or campaign_id");
        //     continue;
        //   }

          const { request_id, campaign_id } = job;

          // Step 1: Fetch request details from backend
          const getDetailsUrl = `${backendBaseUrl}/api/v1/campaign/${campaign_id}/image/requests/${request_id}/get`;
          logger.info(`🔍 Fetching job details from: ${getDetailsUrl}`);

          const detailsResponse = await retryRequest(
            () => axios.get(getDetailsUrl),
            3,
            1000,
            "fetch-details"
          );

          if (!detailsResponse || !detailsResponse.data) {
            logger.error(`❌ No data found for request_id ${request_id}`);
            continue;
          }

          const fullJobDetails = detailsResponse.data;

          // Step 2: Send to Flask API
          try {
            logger.info(`🧠 Sending job to Flask API at ${flaskApiEndpoint}`);
            const flaskResponse = await retryRequest(
              () => axios.post(flaskApiEndpoint, fullJobDetails, { timeout: 60000 }),
              2,
              2000,
              "flask-api"
            );

            if (flaskResponse && flaskResponse.data) {
              logger.info(`✅ Flask job processed successfully for request ${request_id}`);
              finalStatus = "Completed";
            } else {
              logger.warn(`⚠️ Flask returned no response for request ${request_id}`);
            }
          } catch (flaskErr: any) {
            logger.error(`❌ Flask API error: ${flaskErr.message}`);
          }
        } catch (jobErr: any) {
          logger.error(`💥 Job processing failed: ${jobErr.message}`);
        }

        // Step 3: Update final status
        if (job.request_id && job.campaign_id) {
          const updateUrl = `${backendBaseUrl}/api/v1/campaign/${job.campaign_id}/image/requests/${job.request_id}/update-status`;
          const statusToSend = finalStatus.toLowerCase();

          await retryRequest(
            () => axios.put(updateUrl, { new_status: statusToSend }),
            3,
            1000,
            "update-status"
          );

          logger.info(`📦 Updated request ${job.request_id} -> ${statusToSend}`);

          // Step 4: Delete message from queue
          if (message.ReceiptHandle) {
            try {
              await sqsClient.send(
                new DeleteMessageCommand({
                  QueueUrl: queueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                })
              );
              logger.info(`🗑️ Deleted message for request ${job.request_id} from SQS.`);
            } catch (deleteErr: any) {
              logger.error(`❌ Failed to delete message: ${deleteErr.message}`);
            }
          }
        } else {
          logger.warn("⚠️ Skipping status update — missing job.request_id or campaign_id.");
        }
      }
    } catch (pollErr: any) {
      logger.error(`🔁 Polling error: ${pollErr.message}`);
      await sleep(5000);
    }
  }
};

// Start listener safely
const start = async () => {
  const queueUrl = await resolveQueueUrl();
  if (!queueUrl) {
    logger.error("❌ Could not start listener — queue URL resolution failed.");
    return;
  }

  try {
    await pollQueue(queueUrl);
  } catch (err: any) {
    logger.error(`💥 Listener crashed: ${err.message}`);
    logger.info("Restarting listener in 10 seconds...");
    await sleep(10000);
    start();
  }
};

start();
