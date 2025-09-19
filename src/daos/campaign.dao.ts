import { CreationAttributes, FindOptions, Transaction } from 'sequelize';
import { Campaign } from '../models/campaign';
import { CampaignAsset } from '../models/campaignasset';
import { Asset } from '../models/asset';

class CampaignDAO {
    
    public async createCampaign(data: CreationAttributes<Campaign>, transaction: Transaction): Promise<Campaign> {
        return Campaign.create(data, { transaction });
    }

    public async bulkCreateCampaignAssets(data: readonly CreationAttributes<CampaignAsset>[], transaction: Transaction): Promise<CampaignAsset[]> {
        return CampaignAsset.bulkCreate(data, { transaction });
    }
    
    public async findById(id: number): Promise<Campaign | null> {
        return Campaign.findByPk(id, {
            // Eager load the associated master Assets
            include: [Asset]
        });
    }

    public async list(options: FindOptions): Promise<Campaign[]> {
        return Campaign.findAll(options);
    }
}

export default new CampaignDAO();
