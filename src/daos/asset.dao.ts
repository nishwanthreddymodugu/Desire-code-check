import { CreationAttributes, FindOptions } from 'sequelize';
import { Asset } from '../models/asset';
import logger from '../config/logger'; // Winston logger

class AssetDAO {

  public async save(data: CreationAttributes<Asset>): Promise<Asset> {
    try {
      logger.info(`[AssetDAO] Saving asset: ${data.assetName}`);
      const [asset] = await Asset.upsert(data);
      logger.info(`[AssetDAO] Asset saved successfully: ${asset.assetName} (ID: ${asset.assetId})`);
      return asset;
    } catch (error: any) {
      logger.error(`[AssetDAO] Error saving asset: ${error.message}`);
      throw error;
    }
  }

  public async list(options: FindOptions): Promise<Asset[]> {
    try {
      logger.info(`[AssetDAO] Listing assets with options: ${JSON.stringify(options)}`);
      const assets = await Asset.findAll(options);
      logger.info(`[AssetDAO] Found ${assets.length} assets`);
      return assets;
    } catch (error: any) {
      logger.error(`[AssetDAO] Error listing assets: ${error.message}`);
      throw error;
    }
  }

  public async findById(id: number): Promise<Asset | null> {
    try {
      logger.info(`[AssetDAO] Finding asset by ID: ${id}`);
      const asset = await Asset.findByPk(id);
      if (asset) logger.info(`[AssetDAO] Asset found: ${asset.assetName} (ID: ${asset.assetId})`);
      else logger.warn(`[AssetDAO] Asset not found with ID: ${id}`);
      return asset;
    } catch (error: any) {
      logger.error(`[AssetDAO] Error finding asset by ID: ${error.message}`);
      throw error;
    }
  }

  public async findByName(name: string): Promise<Asset | null> {
    try {
      logger.info(`[AssetDAO] Finding asset by name: ${name}`);
      const asset = await Asset.findOne({ where: { assetName: name } });
      if (asset) logger.info(`[AssetDAO] Asset found: ${asset.assetName} (ID: ${asset.assetId})`);
      else logger.warn(`[AssetDAO] Asset not found with name: ${name}`);
      return asset;
    } catch (error: any) {
      logger.error(`[AssetDAO] Error finding asset by name: ${error.message}`);
      throw error;
    }
  }
}

export default new AssetDAO();
