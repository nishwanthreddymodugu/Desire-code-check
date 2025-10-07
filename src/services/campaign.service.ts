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
  public create(data: CampaignIn): Promise<CampaignCreateOut> {
    return new Promise(async (resolve, reject) => {
      const transaction = await sequelize.transaction();
      try {
        logger.debug(`Attempting to create campaign: ${data.campaignname}`);

        // Validation for campaign name
        if (!data.campaignname || data.campaignname.trim() === '') {
          return reject(new Error("Validation failed: campaignname is required and cannot be empty.")); // Highlighted change: Added validation for empty campaign names
        }

        // Fetch template and assets in parallel
        const [template, originalAssets] = await Promise.all([
          TemplateDAO.findById(data.templateId),
          AssetDAO.list({ where: { assetId: data.assets } }),
          VerticalDAO.findById(data.verticalId)
        ]);

        // Validate template and vertical existence
        const vertical = await VerticalDAO.findById(data.verticalId);
        if (!template) {
          await transaction.rollback();
          return reject(new Error(`Template with ID '${data.templateId}' does not exist.`));
        }
        if (!vertical) {
          await transaction.rollback();
          return reject(new Error(`Vertical with ID '${data.verticalId}' does not exist.`));
        }

        // Validate template belongs to the correct vertical
        if (template.verticalId !== data.verticalId) {
          await transaction.rollback();
          return reject(new Error(`Template '${data.templateId}' does not belong to Vertical '${data.verticalId}'.`)); // Highlighted change: Added vertical validation
        }
        // Validate all asset IDs exist
        const foundAssetIds = originalAssets.map((a) => a.assetId);
        const missingAssetIds = data.assets.filter((id) => !foundAssetIds.includes(id));
        if (missingAssetIds.length > 0) {
          await transaction.rollback();
          return reject(new Error(`These asset IDs do not exist: ${missingAssetIds.join(', ')}.`)); // Highlighted change: Added asset existence validation
        }

        // Validate all assets have a `figmaId`
        for (const asset of originalAssets) {
          if (!asset.figmaId) {
            await transaction.rollback();
            return reject(new Error(`Asset '${asset.assetName}' (ID: ${asset.assetId}) is missing a figmaId.`)); // Highlighted change: Added figmaId validation
          }
        }

        // Create the campaign
        const campaignData: CreationAttributes<Campaign> = {
          campaignName: data.campaignname,
          description: data.description,
          fromDate: new Date(data.fromdate),
          toDate: new Date(data.todate),
          templateId: template.templateId,
          verticalId: template.verticalId,
          status: 'draft',
          createdBy: data.createdBy,
          createdAt: new Date(),
          //updatedAt: new Date()
        };
        const newCampaign = await CampaignDAO.createCampaign(campaignData, transaction);

        // Clone assets in Figma
        const clonePromises = originalAssets.map((asset) => figmaService.cloneFile(asset.figmaId!));
        const clonedFigmaIds = await Promise.all(clonePromises);

        // Create campaign assets
        const campaignAssetsToCreate = originalAssets.map((asset, index) => ({
          campaignId: newCampaign.campaignId,
          assetId: asset.assetId,
          assetName: asset.assetName,
          clonedFigmaId: clonedFigmaIds[index].clonedFileId,
        }));
        const createdAssets = await CampaignDAO.bulkCreateCampaignAssets(campaignAssetsToCreate, transaction);

        // Commit the transaction
        await transaction.commit();
        logger.info(`Campaign created successfully: ${newCampaign.campaignName} (ID: ${newCampaign.campaignId})`);

        // Resolve with the created campaign details
        resolve({
          campaignId: newCampaign.campaignId,
          campaignname: newCampaign.campaignName,
          description: newCampaign.description,
          fromdate: newCampaign.fromDate,
          todate: newCampaign.toDate,
          verticalId: newCampaign.verticalId,
          templateId: newCampaign.templateId,
          assets: createdAssets.map(asset => asset.assetId),
          createdBy: newCampaign.createdBy,
          createdAt: newCampaign.createdAt.toISOString(),
         //updatedAt: newCampaign.updatedAt.toISOString()
        });
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
              //updatedAt: newCampaign.updatedAt,
              verticalName: vertical.verticalName,
              templateName: template.templateName,
              createdBy: newCampaign.createdBy,
              //updatedBy: newCampaign.updatedBy,
          };
          // Asynchronously send the document to the search service.
          // We don't 'await' this, so the main API response is fast.
          SearchService.addCampaignToIndex(campaignDoc);
      } catch (searchError) {
          // If indexing fails, we only log the error. We do not fail the main request.
          logger.error(`Failed to index campaign ${newCampaign.campaignId} after creation:`, searchError);
      }
      } catch (error: any) {
        await transaction.rollback();
        reject(error);
      }
    });
  }
  // List campaigns
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
            createdBy: c.createdBy || null,
            createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
            //updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt
          }))
        );
      } catch (error: any) {
        reject(error);
      }
    });
  }

  // Get campaign by ID
  public getById(campaignId: number): Promise<CampaignGetOut> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Attempting to fetch campaign by ID: ${campaignId}`);

        const campaign = await CampaignDAO.findById(campaignId);
        
        if (!campaign) return reject(new Error('Campaign not found'));
        
        resolve({
          campaignId: campaign.campaignId,
          campaignname: campaign.campaignName,
          description: campaign.description,
          status: campaign.status,
          fromdate: campaign.fromDate,
          todate: campaign.toDate,
          verticalId: campaign.verticalId,
          templateId: campaign.templateId,
          assets: campaign.assets ? campaign.assets.map(asset => asset.assetId) : [],
          createdBy: campaign.createdBy || null,
          createdAt: campaign.createdAt instanceof Date ? campaign.createdAt.toISOString() : campaign.createdAt,
         // updatedAt: campaign.updatedAt instanceof Date ? campaign.updatedAt.toISOString() : campaign.updatedAt
        });
      } catch (error: any) {
        reject(error);
      }
      logger.info(`Fetched campaign by ID: ${campaignId}`);
    });
  }
}

export default new CampaignService();
