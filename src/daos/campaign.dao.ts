import { CreationAttributes, FindOptions, Transaction } from 'sequelize';
import { Campaign } from '../models/campaign';
import { CampaignAsset } from '../models/campaignasset';
import { Asset } from '../models/asset';
import createLogger from '../config/logger';
import { Vertical } from '../models/vertical';
import { Template } from '../models/template';
import { User } from '../models/user';
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
            const campaign = await Campaign.findByPk(id, { include: [Asset, Vertical, Template] });
            return campaign;
        } catch (error) {
            logger.error(`${id}: ${(error as Error).message}`);
            throw error;
        }
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
    /**
     * Finds all campaigns within a date range, eagerly loading related data for indexing.
     * @param options The Sequelize query options, including the date range.
     */
    public async findAllForIndexing(options: FindOptions): Promise<Campaign[]> {
        return Campaign.findAll({
            ...options,
            include: [Vertical, Template, Asset,{ model: User, as: 'creator' }]
        });
    }
}

export default new CampaignDAO();
