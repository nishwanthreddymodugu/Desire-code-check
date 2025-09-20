import { CreationAttributes, FindOptions, Transaction } from 'sequelize';
import { Campaign } from '../models/campaign';
import { CampaignAsset } from '../models/campaignasset';
import { Asset } from '../models/asset';
import logger from '../config/logger'; // Winston logger

class CampaignDAO {

  public async createCampaign(data: CreationAttributes<Campaign>, transaction: Transaction): Promise<Campaign> {
    try {
      logger.info(`[CampaignDAO] Creating campaign: ${data.campaignName}`);
      const campaign = await Campaign.create(data, { transaction });
      logger.info(`[CampaignDAO] Campaign created successfully: ${campaign.campaignName} (ID: ${campaign.campaignId})`);
      return campaign;
    } catch (error: any) {
      logger.error(`[CampaignDAO] Error creating campaign: ${error.message}`);
      throw error;
    }
  }

  public async bulkCreateCampaignAssets(
    data: readonly CreationAttributes<CampaignAsset>[],
    transaction: Transaction
  ): Promise<CampaignAsset[]> {
    try {
      logger.info(`[CampaignDAO] Bulk creating ${data.length} campaign assets`);
      const campaignAssets = await CampaignAsset.bulkCreate(data, { transaction });
      logger.info(`[CampaignDAO] Successfully created ${campaignAssets.length} campaign assets`);
      return campaignAssets;
    } catch (error: any) {
      logger.error(`[CampaignDAO] Error bulk creating campaign assets: ${error.message}`);
      throw error;
    }
  }

  public async findById(id: number): Promise<Campaign | null> {
    try {
      logger.info(`[CampaignDAO] Finding campaign by ID: ${id}`);
      const campaign = await Campaign.findByPk(id, { include: [Asset] });
      if (campaign) logger.info(`[CampaignDAO] Campaign found: ${campaign.campaignName} (ID: ${campaign.campaignId})`);
      else logger.warn(`[CampaignDAO] Campaign not found with ID: ${id}`);
      return campaign;
    } catch (error: any) {
      logger.error(`[CampaignDAO] Error finding campaign by ID: ${error.message}`);
      throw error;
    }
  }

  public async list(options: FindOptions): Promise<Campaign[]> {
    try {
      logger.info(`[CampaignDAO] Listing campaigns with options: ${JSON.stringify(options)}`);
      const campaigns = await Campaign.findAll(options);
      logger.info(`[CampaignDAO] Found ${campaigns.length} campaigns`);
      return campaigns;
    } catch (error: any) {
      logger.error(`[CampaignDAO] Error listing campaigns: ${error.message}`);
      throw error;
    }
  }
}

export default new CampaignDAO();
