import { CreationAttributes, FindOptions } from 'sequelize';
import TemplateDAO from '../daos/template.dao';
import VerticalDAO from '../daos/vertical.dao';
import { Template } from '../models/template';
import { TemplateIn, TemplateOut, TemplateGetOut } from '../interfaces/template.interface';
import createLogger from '../config/logger';
import fs from 'fs/promises'; 
import s3Service from './s3.service';
import path from 'path';

const logger = createLogger(module);


class TemplateService {
  public save(data: TemplateIn): Promise<TemplateOut> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Attempting to save template: ${data.templatename}`);
        if (!data.templatename) throw new Error("templatename is required.");
        if (!data.verticalId) throw new Error("verticalId is required.");

        const templatesInSameVertical = await TemplateDAO.list({ where: { verticalId: data.verticalId } });
        const duplicateInSameVertical = templatesInSameVertical.find(t =>
          t.templateName.toLowerCase() === data.templatename.toLowerCase() &&
          (!data.templateId || t.templateId !== data.templateId)
        );

        if (duplicateInSameVertical) {
          return reject(new Error("templatename already exists under this vertical, please use another name."));
        }

        const templatesWithName = await TemplateDAO.list({ where: { templateName: data.templatename } });
        const duplicateInOtherVertical = templatesWithName.find(t =>
          t.verticalId !== data.verticalId &&
          (!data.templateId || t.templateId !== data.templateId)
        );

        if (duplicateInOtherVertical) {
          return reject(new Error("templatename already exists in a different vertical, use another name."));
        }

        const parentVertical = await VerticalDAO.findById(data.verticalId);
        if (!parentVertical) {
          return reject(new Error(`Cannot save template because Vertical with ID '${data.verticalId}' does not exist.`));
        }

        const dataToSave: CreationAttributes<Template> = {
          templateId: data.templateId,
          templateName: data.templatename,
          verticalId: data.verticalId,
        };

        const savedTemplate = await TemplateDAO.save(dataToSave);
        logger.info(`Template saved successfully: ${savedTemplate.templateName} (ID: ${savedTemplate.templateId})`);

        resolve({
          templateId: savedTemplate.templateId,
          templatename: savedTemplate.templateName,
          verticalId: savedTemplate.verticalId,
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  public list(verticalId: number): Promise<TemplateOut[]> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Attempting to list templates for verticalId: ${verticalId}`);
        const options: FindOptions = {
          where: { verticalId },
          order: [['templateName', 'ASC']],
        };
        const templates = await TemplateDAO.list(options);

        resolve(
          templates.map((t) => ({
            templateId: t.templateId,
            templatename: t.templateName,
            verticalId: t.verticalId,
          }))
        );
        const count = templates.length;
        if (count === 0) {
          logger.info(`No templates found for verticalId: ${verticalId}`);
        } else {
          const label = count === 1 ? 'template' : 'templates';
          logger.info(`Returned ${count} ${label} for verticalId: ${verticalId}`);
        }
      } catch (error: any) {
        reject(error);
      }
    });
  }
  
  public getById(templateId: number): Promise<TemplateGetOut> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Attempting to fetch template by ID: ${templateId}`);

        const template = await TemplateDAO.findById(templateId);

        if (!template) {
          return reject(new Error('Template not found'));
        }

        const result: TemplateGetOut = {
          templateId: template.templateId,
          templatename: template.templateName,
          verticalId: template.verticalId,
          stylePrompt: template.stylePrompt,
          createdBy: template.createdBy,
          updatedBy: template.updatedBy,
          deleted: template.deleted,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        };

        logger.info(`Fetched template by ID: ${templateId}, Name: ${template.templateName}`);
        resolve(result);
      }catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch template';
      logger.error(`Error fetching template ID ${templateId}: ${message}`);
      reject(new Error(message));
      }
    });
  }

  public async uploadImage(
    verticalId: number,
    templateId: number,
    file: Express.Multer.File
  ): Promise<{ verticalId: number; templateId: number; filename: string; s3Key: string }> {
    if (!verticalId || !templateId) {
      return Promise.reject(new Error('verticalId and templateId are required'));
    }

    if (!file) {
      return Promise.reject(new Error('Image file is required'));
    }

    const s3Key = `verticals/${verticalId}/templates/${templateId}/${file.originalname}`;
    const bucket = process.env.IMAGE_BUCKET;

    if (!bucket) {
      logger.error('IMAGE_BUCKET environment variable is not set');
      return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
    }

    try {
      const fileBuffer = await fs.readFile(file.path);
      logger.info(`Successfully read file ${file.originalname}`);
      await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);
      try {
        await fs.unlink(file.path);
        logger.info(`Deleted local template image file: ${file.originalname}`);
      } catch (unlinkErr) {
        logger.error(`Attempting to delete local file failed: ${file.path}, error: ${(unlinkErr as Error).message}`);
      }
      return { verticalId, templateId, filename: file.originalname, s3Key };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload template image';
      return Promise.reject(new Error(message));
    }
  }
  public async listImages(
  verticalId: number,
  templateId: number
): Promise<{ filename: string; path: string }[]> {
  const bucket = process.env.IMAGE_BUCKET;
  if (!bucket) throw new Error('IMAGE_BUCKET environment variable is not set');

  const prefix = `verticals/${verticalId}/templates/${templateId}/`;

  // Assuming your s3Service.listObjects() returns an array of string keys
  const objectKeys: string[] = await s3Service.listObjects(bucket, prefix);

  if (!objectKeys || objectKeys.length === 0) {
    return [];
  }

  // Just return the key and filename (no signed URL, since you don't want to change s3Service)
  return objectKeys.map(key => ({
    filename: key.split('/').pop() || '',
    path: key, // full S3 path
  }));
}

// Get a single image by name (compatible with your existing s3Service)
public async getTemplateImage(
  verticalId: number,
  templateId: number,
  imageName: string
): Promise<{ buffer: Buffer; contentType: string; s3Key: string }> {
  if (!verticalId) throw new Error('verticalId is required');
  if (!templateId) throw new Error('templateId is required');
  if (!imageName) throw new Error('imageName is required');

  const bucket = process.env.IMAGE_BUCKET;
  if (!bucket) throw new Error('IMAGE_BUCKET environment variable is not set');

  const s3Prefix = `verticals/${verticalId}/templates/${templateId}/`;
  const expectedKey = `${s3Prefix}${imageName}`;

  const allObjects = await s3Service.getObjectsByPrefix(bucket, s3Prefix);
  const imageObject = allObjects.find(obj => obj.key === expectedKey);

  if (!imageObject || !imageObject.body) {
    throw new Error(`Image '${imageName}' not found for verticalId ${verticalId} and templateId ${templateId}`);
  }

  const buffer = imageObject.body as Buffer;
  const s3Key = imageObject.key;

  const ext = path.extname(s3Key).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';

  return { buffer, contentType, s3Key };
}

public async deleteImage(
  verticalId: number,
  templateId: number,
  imageName: string
): Promise<void> {
  const bucket = process.env.IMAGE_BUCKET;
  if (!bucket) throw new Error('IMAGE_BUCKET environment variable is not set');

  const s3Key = `verticals/${verticalId}/templates/${templateId}/${imageName}`;

  try {
    // Check if image exists using existing s3Service
    const objects = await s3Service.getObjectsByPrefix(bucket, s3Key);
    if (!objects || objects.length === 0) {
      throw new Error(`Image '${imageName}' not found in S3.`);
    }

    // Use S3 client for deletion (with LocalStack endpoint and path style)
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_S3_ENDPOINT, // LocalStack endpoint
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE?.toLowerCase() === 'true',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      })
    );

    logger.info(`Deleted image '${imageName}' from S3 successfully.`);
  } catch (error) {
    logger.error(`Failed to delete image '${imageName}': ${(error as Error).message}`);
    throw new Error(`Failed to delete image: ${(error as Error).message}`);
  }
}
}
export default new TemplateService();