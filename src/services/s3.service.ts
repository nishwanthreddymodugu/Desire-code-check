import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import createLogger from '../config/logger';

const logger = createLogger(module);

type UploadBody = Buffer | Uint8Array | string;

interface RetrievedObject {
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

class S3Service {
  private client: S3Client;

  constructor() {
    const config: S3ClientConfig = {};

    if (process.env.AWS_REGION) {
      config.region = process.env.AWS_REGION;
    } else {
      logger.warn('AWS_REGION not set. Falling back to AWS SDK defaults.');
    }

    if (process.env.AWS_S3_ENDPOINT) {
      config.endpoint = process.env.AWS_S3_ENDPOINT;
    }

    if (process.env.AWS_S3_FORCE_PATH_STYLE?.toLowerCase() === 'true') {
      config.forcePathStyle = true;
    }

    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      };
    }

    this.client = new S3Client(config);
  }

  public async listObjects(bucket: string, prefix?: string): Promise<string[]> {
    if (!bucket) throw new Error('Bucket name is required to list objects.');

    const keys: string[] = [];
    let continuationToken: string | undefined;

    try {
      do {
        const response = await this.client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          })
        );

        response.Contents?.forEach(item => {
          if (item.Key) keys.push(item.Key);
        });

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
      } while (continuationToken);

      logger.info(
        `Found ${keys.length} object(s) in bucket '${bucket}'${prefix ? ` with prefix '${prefix}'` : ''}.`
      );

      return keys;
    } catch (error: any) {
      logger.error(
        `Failed to list objects in bucket '${bucket}'${prefix ? ` with prefix '${prefix}'` : ''}: ${error.message}`
      );
      throw error;
    }
  }

  public async putObject(
    bucket: string,
    key: string,
    body: UploadBody,
    contentType?: string
  ): Promise<void> {
    if (!bucket) throw new Error('Bucket name is required to upload an object.');
    if (!key) throw new Error('Object key is required to upload an object.');
    if (body === undefined || body === null) throw new Error('Object body is required to upload an object.');

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );

      logger.info(`Uploaded object '${key}' to bucket '${bucket}'.`);
    } catch (error: any) {
      logger.error(`Failed to upload object '${key}' to bucket '${bucket}': ${error.message}`);
      throw error;
    }
  }

  public async getObjectsByPrefix(bucket: string, prefix: string): Promise<RetrievedObject[]> {
    if (!bucket) throw new Error('Bucket name is required to retrieve objects.');
    if (!prefix) throw new Error('Prefix is required to retrieve objects.');

    try {
      const keys = await this.listObjects(bucket, prefix);

      const objects = await Promise.all(
        keys.map(async key => {
          const response = await this.client.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: key,
            })
          );

          const body = await this.readBody(response.Body);

          return {
            key,
            body,
            contentType: response.ContentType,
            metadata: response.Metadata,
          };
        })
      );

      logger.info(
        `Retrieved ${objects.length} object(s) from bucket '${bucket}' with prefix '${prefix}'.`
      );

      return objects;
    } catch (error: any) {
      logger.error(`Failed to retrieve objects from bucket '${bucket}' with prefix '${prefix}': ${error.message}`);
      throw error;
    }
  }

  private async readBody(body: any): Promise<Buffer> {
    if (!body) return Buffer.alloc(0);

    if (Buffer.isBuffer(body)) return body;

    if (typeof body === 'string') return Buffer.from(body);

    if (body instanceof Uint8Array) return Buffer.from(body);

    if (body instanceof Readable) {
      const chunks: Buffer[] = [];

      for await (const chunk of body) {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk));
        } else if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else {
          chunks.push(Buffer.from(chunk));
        }
      }

      return Buffer.concat(chunks);
    }

    if (typeof body.arrayBuffer === 'function') {
      const arrayBuffer = await body.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (typeof body.getReader === 'function') {
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let result = await reader.read();

      while (!result.done) {
        chunks.push(result.value);
        result = await reader.read();
      }

      return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    }

    throw new Error('Unsupported S3 response body type.');
  }
}

export default new S3Service();
