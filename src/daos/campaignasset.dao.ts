import { CampaignAsset } from '../models/campaignasset';
import createLogger from '../config/logger';
const logger = createLogger(module);

class CampaignAssetDAO {
  public async findByCampaignAsset(campaignId: number, assetId: number): Promise<CampaignAsset | null> {
    try {
      return await CampaignAsset.findOne({ where: { campaignId, assetId } });
    } catch (error) {
      logger.error(`${campaignId},${assetId}: ${(error as Error).message}`);
      throw error;
    }
  }
}


export default new CampaignAssetDAO();
