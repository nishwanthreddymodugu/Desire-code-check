import { CreationAttributes, FindOptions } from 'sequelize';
import AssetDAO from '../daos/asset.dao';
import TemplateDAO from '../daos/template.dao';
import VerticalDAO from '../daos/vertical.dao';
import { Asset } from '../models/asset';
import { AssetIn, AssetOut } from '../interfaces/asset.interface';
import logger from '../config/logger'; // Winston logger

class AssetService {
  public save(data: AssetIn): Promise<AssetOut> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info(`Attempting to save asset: ${data.assetname}`);

        // Validations
        if (!data.assetname) throw new Error('Validation failed: assetname is required.');
        if (!data.templateId) throw new Error('Validation failed: templateId is required.');
        if (!data.verticalId) throw new Error('Validation failed: verticalId is required.');

        // Check vertical
        const parentVertical = await VerticalDAO.findById(data.verticalId);
        if (!parentVertical) {
          const msg = `Vertical with ID '${data.verticalId}' does not exist.`;
          logger.error(msg);
          return reject(new Error(msg));
        }

        // Check template
        const parentTemplate = await TemplateDAO.findById(data.templateId);
        if (!parentTemplate) {
          const msg = `Template with ID '${data.templateId}' does not exist.`;
          logger.error(msg);
          return reject(new Error(msg));
        }

        // Ensure template belongs to vertical
        if (parentTemplate.verticalId !== parentVertical.verticalId) {
          const msg = `Template '${parentTemplate.templateName}' does not belong to Vertical '${parentVertical.verticalName}'.`;
          logger.error(msg);
          return reject(new Error(msg));
        }

        // Check for duplicate asset name
        const existingAsset = await AssetDAO.findByName(data.assetname);
        if (existingAsset && existingAsset.assetId !== data.assetId) {
          const msg = `Asset name '${data.assetname}' already exists. Name must be unique.`;
          logger.error(msg);
          return reject(new Error(msg));
        }

        // Prepare data to save
        const dataToSave: CreationAttributes<Asset> = {
          assetId: data.assetId,
          assetName: data.assetname,
          description: data.description,
          figmaURL: data.figmaURL,
          figmaId: data.figmaId,
          templateId: data.templateId,
          verticalId: data.verticalId,
        };

        // Save asset
        const savedAsset = await AssetDAO.save(dataToSave);

        logger.info(`Asset saved successfully: ${savedAsset.assetName}`);

        resolve({
          assetId: savedAsset.assetId,
          assetname: savedAsset.assetName,
          description: savedAsset.description,
          figmaURL: savedAsset.figmaURL,
          figmaId: savedAsset.figmaId,
          templateId: savedAsset.templateId,
          verticalId: savedAsset.verticalId,
        });
      } catch (error: any) {
        logger.error(`Error saving asset: ${error.message}`);
        reject(error);
      }
    });
  }

  public list(templateId: number): Promise<AssetOut[]> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info(`Fetching assets for templateId: ${templateId}`);

        const options: FindOptions = {
          where: { templateId },
          order: [['assetname', 'ASC']],
        };

        const assets = await AssetDAO.list(options);

        logger.info(`Found ${assets.length} assets for templateId: ${templateId}`);

        resolve(
          assets.map(asset => ({
            assetId: asset.assetId,
            assetname: asset.assetName,
            description: asset.description,
            figmaURL: asset.figmaURL,
            figmaId: asset.figmaId,
            templateId: asset.templateId,
            verticalId: asset.verticalId,
          }))
        );
      } catch (error: any) {
        logger.error(`Error fetching assets: ${error.message}`);
        reject(error);
      }
    });
  }
}

export default new AssetService();