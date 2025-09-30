import { CreationAttributes, FindOptions, Transaction } from 'sequelize';
import { Campaign } from '../models/campaign';
import { CampaignAsset } from '../models/campaignasset';
import { Asset } from '../models/asset';
import createLogger from '../config/logger';
const logger = createLogger(module);

class CampaignDAO {
    
    public async createCampaign(data: CreationAttributes<Campaign>, transaction: Transaction): Promise<Campaign> {
        try {
            const campaign = await Campaign.create(data, { transaction });
            return campaign;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }

    public async bulkCreateCampaignAssets(data: readonly CreationAttributes<CampaignAsset>[], transaction: Transaction): Promise<CampaignAsset[]> {
        try {
            const assets = await CampaignAsset.bulkCreate(data, { transaction });
            return assets;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }
    
    public async findById(id: number): Promise<Campaign | null> {
        try {
            const campaign = await Campaign.findByPk(id, { include: [Asset] });
            return campaign;
        } catch (error) {
            logger.error(`${id}: ${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * Finds a single campaign by its unique name.
     * @param name The name of the campaign to find.
     */
    public async findByName(name: string): Promise<Campaign | null> {
        return Campaign.findOne({ where: { campaignName: name } });
    }

    public async list(options: FindOptions): Promise<Campaign[]> {
        try {
            const campaigns = await Campaign.findAll(options);
            return campaigns;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }
}

export default new CampaignDAO();
