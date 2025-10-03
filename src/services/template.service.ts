import { CreationAttributes, FindOptions } from 'sequelize';
import TemplateDAO from '../daos/template.dao';
import VerticalDAO from '../daos/vertical.dao';
import { Template } from '../models/template';
import { TemplateIn, TemplateOut } from '../interfaces/template.interface';
import createLogger from '../config/logger';
import fs from 'fs';
import s3Service from './s3.service';
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

  public async uploadImage(
    verticalId: string,
    templateId: string,
    file: Express.Multer.File
  ): Promise<{ verticalId: string; templateId: string; filename: string }> {
    if (!verticalId) throw new Error('verticalId is required');
    if (!templateId) throw new Error('templateId is required');
    if (!file) throw new Error('Image file is required');

    // Construct the S3 key as per your requirements
    const s3Key = `verticals/${verticalId}/templates/${templateId}/images/${file.filename}`;
    const bucket = process.env.IMAGE_BUCKET;
    if (!bucket) {
      logger.error(`IMAGE_BUCKET environment variable is not set`);
      throw new Error('IMAGE_BUCKET environment variable is not set');
    }
    logger.debug(`Preparing to upload image for verticalId: ${verticalId}, templateId: ${templateId} with key: ${s3Key}`);
    
    // Read the file from disk
    const fileBuffer = fs.readFileSync(file.path);

    // Upload to S3 using your S3Service
    await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);
    
    // Delete the local file after successful upload
    try {
      fs.unlinkSync(file.path);
      logger.info(`Deleted local image file`);
    } catch (err: any) {
      logger.error(`Failed to delete local image file: ${err.message}`);
    }

    return {
      verticalId,
      templateId,
      filename: file.originalname,
    };
  }
}
export default new TemplateService();