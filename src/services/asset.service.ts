import { CreationAttributes, FindOptions } from 'sequelize';
import AssetDAO from '../daos/asset.dao';
import TemplateDAO from '../daos/template.dao';
import VerticalDAO from '../daos/vertical.dao';
import { Asset } from '../models/asset';
import { AssetIn, AssetOut } from '../interfaces/asset.interface';
import createLogger from '../config/logger';

const logger = createLogger(module);

class AssetService {
  public save(data: AssetIn): Promise<AssetOut> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Attempting to save asset: ${data.assetname}`);
        if (!data.assetname) throw new Error('Validation failed: assetname is required.');
        if (!data.templateId) throw new Error('Validation failed: templateId is required.');
        if (!data.verticalId) throw new Error('Validation failed: verticalId is required.');

        const parentVertical = await VerticalDAO.findById(data.verticalId);
        if (!parentVertical) return reject(new Error(`Cannot save asset because Vertical with ID '${data.verticalId}' does not exist.`));

        const parentTemplate = await TemplateDAO.findById(data.templateId);
        if (!parentTemplate) return reject(new Error(`Cannot save asset because Template with ID '${data.templateId}' does not exist.`));

        if (parentTemplate.verticalId !== parentVertical.verticalId) {
          return reject(new Error(`Template '${parentTemplate.templateName}' does not belong to Vertical '${parentVertical.verticalName}'.`));
        }

        const existingAsset = await AssetDAO.findByName(data.assetname);
        if (existingAsset && existingAsset.assetId !== data.assetId) {
          return reject(new Error(`Asset name '${data.assetname}' already exists. Name must be unique.`));
        }

        const dataToSave: CreationAttributes<Asset> = {
          assetId: data.assetId,
          assetName: data.assetname,
          description: data.description,
          figmaURL: data.figmaURL,
          figmaId: data.figmaId,
          templateId: data.templateId,
          verticalId: data.verticalId,
          prod_image_width: data.prod_image_width,  
          prod_image_height: data.prod_image_height,
        };

        const savedAsset = await AssetDAO.save(dataToSave);
        logger.info(`Asset saved successfully: ${savedAsset.assetName} (ID: ${savedAsset.assetId})`);

        resolve({
          assetId: savedAsset.assetId,
          assetname: savedAsset.assetName,
          description: savedAsset.description,
          figmaURL: savedAsset.figmaURL,
          figmaId: savedAsset.figmaId,
          templateId: savedAsset.templateId,
          verticalId: savedAsset.verticalId,
          prod_image_width: savedAsset.prod_image_width,  
          prod_image_height: savedAsset.prod_image_height,
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  public list(templateId: number): Promise<AssetOut[]> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Attempting to list assets for templateId: ${templateId}`);
        const options: FindOptions = {
          where: { templateId },
          order: [['assetname', 'ASC']],
        };
        const assets = await AssetDAO.list(options);

        resolve(
          assets.map(asset => ({
            assetId: asset.assetId,
            assetname: asset.assetName,
            description: asset.description,
            figmaURL: asset.figmaURL,
            figmaId: asset.figmaId,
            templateId: asset.templateId,
            verticalId: asset.verticalId,
            prod_image_width: asset.prod_image_width,  
            prod_image_height: asset.prod_image_height,
          }))
        );
        const count = assets.length;
        if (count === 0) {
          logger.info(`No assets found for templateId: ${templateId}`);
        } else {
          const label = count === 1 ? 'asset' : 'assets';
          logger.info(`Returned ${count} ${label} for templateId: ${templateId}`);
        }
        
      } catch (error: any) {
        reject(error);
      }
    });
  }
}

export default new AssetService();
