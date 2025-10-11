import CampaignAssetDAO from '../daos/campaignasset.dao';
import { CampaignAssetGetOut } from '../interfaces/campaignasset.interface';
import createLogger from '../config/logger';
const logger = createLogger(module);

class CampaignAssetService {
  public getByCampaignAsset(campaignId: number, assetId: number): Promise<CampaignAssetGetOut> {
    return new Promise(async (resolve, reject) => {
        logger.debug(`Attempting to fetch campaign asset for campaignId=${campaignId}, assetId=${assetId}`);
      
      try{
        const asset = await CampaignAssetDAO.findByCampaignAsset(campaignId, assetId);

        if (!asset) {
          return reject(new Error('Asset not found for this campaign'));
        }

        const result: CampaignAssetGetOut = {
          campaignId: asset.campaignId,
          assetId: asset.assetId,
          assetname: asset.assetName,
          clonedFigmaId: asset.clonedFigmaId || null,
        };

        logger.info(`Fetched asset: ${asset.assetName} (campaignId=${campaignId}, assetId=${assetId})`);
        resolve(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch campaign asset';
        logger.error(`Error fetching asset for campaignId=${campaignId}, assetId=${assetId}: ${message}`);
        reject(new Error(message));
      }
    });
  }
}

export default new CampaignAssetService();
