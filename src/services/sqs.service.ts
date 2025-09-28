import {
  GetQueueUrlCommand,
  SendMessageCommand,
  SQSClient,
  type SQSClientConfig,
} from '@aws-sdk/client-sqs';
import logger from '../config/logger';

class SQSService {
  private client: SQSClient;
  private queueUrlCache = new Map<string, string>();

  constructor() {
    const config: SQSClientConfig = {};

    if (process.env.AWS_REGION) {
      config.region = process.env.AWS_REGION;
    } else {
      logger.warn('AWS_REGION not set. Falling back to AWS SDK defaults.');
    }

    if (process.env.AWS_SQS_ENDPOINT) {
      config.endpoint = process.env.AWS_SQS_ENDPOINT;
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      };
    }

    this.client = new SQSClient(config);
  }

  public async enqueueMessage(queueName: string, payload: unknown): Promise<string> {
    if (!queueName) throw new Error('Queue name is required to enqueue a message.');
    if (payload === undefined || payload === null) {
      throw new Error('Payload is required to enqueue a message.');
    }

    try {
      const queueUrl = await this.getQueueUrl(queueName);
      const messageBody = typeof payload === 'string' ? payload : JSON.stringify(payload);

      const response = await this.client.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: messageBody,
        })
      );

      const messageId = response.MessageId ?? '';

      logger.info(`Enqueued message on queue '${queueName}'${messageId ? ` (ID: ${messageId})` : ''}.`);

      return messageId;
    } catch (error: any) {
      logger.error(`Failed to enqueue message on queue '${queueName}': ${error.message}`);
      throw error;
    }
  }

  private async getQueueUrl(queueName: string): Promise<string> {
    const cachedUrl = this.queueUrlCache.get(queueName);
    if (cachedUrl) return cachedUrl;

    try {
      const response = await this.client.send(
        new GetQueueUrlCommand({
          QueueName: queueName,
          QueueOwnerAWSAccountId: process.env.AWS_ACCOUNT_ID,
        })
      );

      if (!response.QueueUrl) {
        throw new Error('Queue URL not returned by AWS SQS.');
      }

      this.queueUrlCache.set(queueName, response.QueueUrl);
      return response.QueueUrl;
    } catch (error) {
      // Rely on caller to log and handle the error.
      throw error;
    }
  }
}

export default new SQSService();

