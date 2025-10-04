import { CreationAttributes, FindOptions } from 'sequelize';
import TemplateDAO from '../daos/template.dao';
import VerticalDAO from '../daos/vertical.dao';
import { Template } from '../models/template';
import { TemplateIn, TemplateOut } from '../interfaces/template.interface';
import createLogger from '../config/logger';
import fs from 'fs/promises'; 
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
    verticalId: number,
    templateId: number,
    file: Express.Multer.File
  ): Promise<{ verticalId: number; templateId: number; filename: string }> {
    if (!verticalId || !templateId) {
      logger.error('verticalId and templateId are required');
      return Promise.reject(new Error('verticalId and templateId are required'));
    }

    if (!file) {
      logger.error('Image file is required');
      return Promise.reject(new Error('Image file is required'));
    }

    const s3Key = `verticals/${verticalId}/templates/${templateId}/images/${file.originalname}`;
    const bucket = process.env.IMAGE_BUCKET;

    if (!bucket) {
      logger.error('IMAGE_BUCKET environment variable is not set');
      return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
    }

    try {
      const fileBuffer = await fs.readFile(file.path);
      await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);
      await fs.unlink(file.path);
      logger.info(`Deleted local template image: ${file.originalname}`);
      return { verticalId, templateId, filename: file.originalname };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload template image';
      logger.error(message);
      return Promise.reject(new Error(message));
    }
  }
}

export default new TemplateService();