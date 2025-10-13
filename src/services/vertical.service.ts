import { CreationAttributes } from 'sequelize';
import VerticalDAO from '../daos/vertical.dao';
import { Vertical } from '../models/vertical';
import { VerticalIn, VerticalOut } from '../interfaces/vertical.interface';
import createLogger from '../config/logger';
import s3Service from './s3.service';

const logger = createLogger(module);

class VerticalService {
  public async save(data: VerticalIn): Promise<VerticalOut> {
    try {
      logger.debug(`Attempting to save vertical: ${data.verticalname}`);
      if (!data.verticalname) throw new Error("Validation failed: verticalname is required.");

      const verticals = await VerticalDAO.list();
      const duplicate = verticals.find(v =>
        v.verticalName.toLowerCase() === data.verticalname.toLowerCase() &&
        (!data.verticalId || v.verticalId !== data.verticalId)
      );
      if (duplicate) {
        throw new Error("verticalname already exists, please use another name.");
      }

      const dataToSave: CreationAttributes<Vertical> = {
        verticalId: data.verticalId,
        verticalName: data.verticalname,
      };

      const savedVertical = await VerticalDAO.save(dataToSave);
      logger.info(`Vertical saved successfully: ${savedVertical.verticalName} (ID: ${savedVertical.verticalId})`);

      return {
        verticalId: savedVertical.verticalId,
        verticalname: savedVertical.verticalName,
      };
    } catch (error: any) {
      throw error;
    }
  }

  public async list(): Promise<VerticalOut[]> {
    try {
      logger.debug("Attempting to list verticals");
      const verticals = await VerticalDAO.list();

      if (!verticals || verticals.length === 0) {
        throw new Error("No verticals found.");
      }
      const count = verticals.length;
      if (count === 0) {
        logger.info(`No verticals found`);
      } else {
        const label = count === 1 ? 'vertical' : 'verticals';
        logger.info(`Returned ${count} ${label}`);
      }

      return verticals.map(v => ({
        verticalId: v.verticalId,
        verticalname: v.verticalName,
      }));
    } catch (error: any) {
      throw error;
    }

  }
  public async getTemplateImages(verticalId: number, templateId: number): Promise<string[]> {
    const bucket = process.env.S3_BUCKET_NAME;
    if (!bucket) {
      throw new Error('S3_BUCKET_NAME is not defined in environment variables');
    }

    const s3Prefix = `verticals/${verticalId}/templates/${templateId}/images/`;

    try {
      const objects = await s3Service.getObjectsByPrefix(bucket, s3Prefix);

      if (!objects || objects.length === 0) {
        throw new Error('No images found for this template');
      }

      const images = objects.map(obj => obj.key);

      return images;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve template images';
      throw new Error(message);
    }
  }

}

export default new VerticalService();
