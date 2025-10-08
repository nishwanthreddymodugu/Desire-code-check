import { FindOptions, Op, CreationAttributes } from 'sequelize';
import { sequelize } from '../config/database';
import CampaignDAO from '../daos/campaign.dao';
import TemplateDAO from '../daos/template.dao';
import AssetDAO from '../daos/asset.dao';
import VerticalDAO from '../daos/vertical.dao'
import { Campaign } from '../models/campaign';
import { Template } from '../models/template';
import figmaService from './figma.service';
import SearchService from './search.service'
import { CampaignDocument } from '../interfaces/search.interface';
import { CampaignIn, CampaignCreateOut, CampaignListOut, CampaignGetOut } from '../interfaces/campaign.interface';
import createLogger from '../config/logger';

const logger = createLogger(module);
class CampaignService {
  // List campaigns
  public create(data: CampaignIn): Promise<CampaignCreateOut> {
    return new Promise(async (resolve, reject) => {
      const transaction = await sequelize.transaction();
      try {
        logger.debug(`Service: Creating campaign '${data.campaignname}'`);

        // --- Step 1: Validation ---
        if (!data.campaignname || data.campaignname.trim() === '') {
          await transaction.rollback();
          return reject(new Error("Validation failed: campaignname is required and cannot be empty."));
        }
        const [template, originalAssets, vertical] = await Promise.all([
          TemplateDAO.findById(data.templateId),
          AssetDAO.list({ where: { assetId: data.assets } }),
          VerticalDAO.findById(data.verticalId)
        ]);
        if (!template) {
          await transaction.rollback();
          return reject(new Error(`Template with ID '${data.templateId}' does not exist.`));
        }
        if (!vertical) {
          await transaction.rollback();
          return reject(new Error(`Vertical with ID '${data.verticalId}' does not exist.`));
        }
        if (template.verticalId !== data.verticalId) {
          await transaction.rollback();
          return reject(new Error(`Template '${data.templateId}' does not belong to Vertical '${data.verticalId}'.`));
        }
        if (originalAssets.length !== data.assets.length) {
          await transaction.rollback();
          return reject(new Error("One or more provided asset IDs do not exist."));
        }

        // Validate all assets have a figmaId
        for (const asset of originalAssets) {
          if (!asset.figmaId) {
            await transaction.rollback();
            return reject(new Error(`Asset '${asset.assetName}' (ID: ${asset.assetId}) is missing a figmaId.`));
          }
        }

        // --- Step 2: Main Logic ---
        const campaignData: CreationAttributes<Campaign> = {
          campaignName: data.campaignname,
          description: data.description,
          fromDate: new Date(data.fromdate),
          toDate: new Date(data.todate),
          templateId: template.templateId,
          verticalId: template.verticalId,
          status: 'draft',
          createdBy: data.createdBy.createdByUserID,
        };
        const newCampaign = await CampaignDAO.createCampaign(campaignData, transaction);
        
        const clonePromises = originalAssets.map(asset => figmaService.cloneFile(asset.figmaId!));
        const clonedFigmaIds = await Promise.all(clonePromises);

        const campaignAssetsToCreate = originalAssets.map((asset, index) => ({
          campaignId: newCampaign.campaignId,
          assetId: asset.assetId,
          assetName: asset.assetName,
          clonedFigmaId: clonedFigmaIds[index].clonedFileId,
        }));
        const createdAssets = await CampaignDAO.bulkCreateCampaignAssets(campaignAssetsToCreate, transaction);

        await transaction.commit();
        logger.info(`Service: Campaign created successfully (ID: ${newCampaign.campaignId})`);

        // --- Step 3: Data Enrichment & Background Indexing ---
        try {
            const campaignDoc: CampaignDocument = {
                campaignId: newCampaign.campaignId,
                campaignname: newCampaign.campaignName,
                description: newCampaign.description,
                status: newCampaign.status,
                fromdate: newCampaign.fromDate,
                todate: newCampaign.toDate,
                verticalId: newCampaign.verticalId,
                templateId: newCampaign.templateId,
                assets: createdAssets.map(a => a.assetId),
                createdAt: newCampaign.createdAt,
                verticalName: vertical.verticalName,
                templateName: template.templateName,
                createdByuserId: newCampaign.createdBy!,
                createdByName: data.createdBy.createdByName,
            };
            SearchService.addCampaignToIndex(campaignDoc);
        } catch (searchError) {
            logger.error(`Failed to index campaign ${newCampaign.campaignId} after creation:`, searchError);
        }
        
        // --- Step 4: Format and Resolve with LEAN Output ---
        const campaignOut: CampaignCreateOut = {
            campaignId: newCampaign.campaignId,
            campaignname: newCampaign.campaignName,
            description: newCampaign.description,
            fromdate: newCampaign.fromDate,
            todate: newCampaign.toDate,
            verticalId: newCampaign.verticalId,
            templateId: newCampaign.templateId,
            assets: createdAssets.map(asset => asset.assetId),
            createdByUserID: newCampaign.createdBy as number,
            createdAt: newCampaign.createdAt.toISOString(),
        };
        return resolve(campaignOut);

      } catch (error: any) {
        await transaction.rollback();
        
        // Handle unique constraint violation for campaign name
        if (error.name === 'SequelizeUniqueConstraintError' && error.errors) {
          const uniqueError = error.errors.find((err: any) => err.path === 'campaignName');
          if (uniqueError) {
            return reject(new Error(`A campaign with the name '${data.campaignname}' already exists.`));
          }
        }
        
        return reject(error);
      }
    });
  }
  public list(filters: any): Promise<CampaignListOut[]> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Attempting to list campaigns`);

        const options: FindOptions = { where: {}, include: [], order: [['createdAt', 'DESC']] };
        const whereClause: any = {};

        if (filters.status) whereClause.status = filters.status;
        if (filters.fromdate) whereClause.fromDate = { [Op.gte]: new Date(filters.fromdate) };
        if (filters.todate) whereClause.toDate = { [Op.lte]: new Date(filters.todate) };
        if (filters.templateId) whereClause.templateId = filters.templateId;
        if (filters.createdAtFrom) whereClause.createdAt = { [Op.gte]: new Date(filters.createdAtFrom) };
        if (filters.createdAtTo) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: new Date(filters.createdAtTo) };
        if (filters.verticalId) {
          (options.include as any).push({ model: Template, where: { verticalId: filters.verticalId }, required: true });
        }
        options.where = whereClause;
        const campaigns = await CampaignDAO.list(options);
        const count = campaigns.length;
        if (count === 0) {
          logger.info(`No campaigns found`);
        } else {
        const label = count === 1 ? 'campaign' : 'campaigns';
        logger.info(`Returned ${count} ${label}`);
        }

        resolve(
          campaigns.map(c => ({
            campaignId: c.campaignId,
            campaignname: c.campaignName,
            fromdate: c.fromDate,
            todate: c.toDate,
            status: c.status,
            verticalId: c.verticalId,
            templateId: c.templateId,
            createdBy: c.createdBy ?? null,
            createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
          }))
        );
      } catch (error: any) {
        reject(error);
      }
    });
  }

public getById(campaignId: number): Promise<CampaignGetOut> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(`Service: Attempting to fetch campaign by ID: ${campaignId}`);

      const campaign = await CampaignDAO.findById(campaignId);
      
      if (!campaign) {
        return reject(new Error('Campaign not found'));
      }
      
      const campaignOut: CampaignGetOut = {
        campaignId: campaign.campaignId,
        campaignname: campaign.campaignName,
        description: campaign.description,
        status: campaign.status,
        fromdate: campaign.fromDate,
        todate: campaign.toDate,
        verticalId: campaign.verticalId,
        templateId: campaign.templateId,
        assets: campaign.assets ? campaign.assets.map(asset => asset.assetId) : [],
        createdByUserID: campaign.createdBy ?? null,
        createdAt: campaign.createdAt.toISOString(),
      };

      logger.info(`Service: Fetched campaign by ID: ${campaignId}`);
      return resolve(campaignOut);
      
    } catch (error: any) {
      logger.error(`Service Error fetching campaign by ID ${campaignId}: ${error.message}`);
      return reject(error);
    }
  });
}
}

export default new CampaignService();
