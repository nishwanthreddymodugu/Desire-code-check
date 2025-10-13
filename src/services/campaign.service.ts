import { FindOptions, Op, CreationAttributes } from 'sequelize';
import { sequelize } from '../config/database';
import CampaignDAO from '../daos/campaign.dao';
import TemplateDAO from '../daos/template.dao';
import AssetDAO from '../daos/asset.dao';
import { Campaign } from '../models/campaign';
import { Template } from '../models/template';
import figmaService from './figma.service';
import { CampaignIn, CampaignCreateOut, CampaignListOut, CampaignGetOut } from '../interfaces/campaign.interface';
import fs from 'fs/promises';
import s3Service from './s3.service';
import createLogger from '../config/logger';

const logger = createLogger(module);

class CampaignService {
  // Create a campaign
  public create(data: CampaignIn): Promise<CampaignCreateOut> {
    return new Promise(async (resolve, reject) => {
      const transaction = await sequelize.transaction();
      try {
        logger.debug(`Attempting to create campaign: ${data.campaignname}`);

        const [template, originalAssets] = await Promise.all([
          TemplateDAO.findById(data.templateId),
          AssetDAO.list({ where: { assetId: data.assets } }),
        ]);

        if (!template) {
          await transaction.rollback();
          return reject(new Error(`Template with ID '${data.templateId}' does not exist.`));
        }
        if (template.verticalId !== data.verticalId) {
          await transaction.rollback();
          return reject(new Error(`Template '${data.templateId}' does not belong to Vertical '${data.verticalId}'.`));
        }

        const foundAssetIds = originalAssets.map(a => a.assetId);
        const missingAssetIds = data.assets.filter(id => !foundAssetIds.includes(id));
        if (missingAssetIds.length > 0) {
          await transaction.rollback();
          return reject(new Error(`These asset IDs do not exist: ${missingAssetIds.join(', ')}.`));
        }

        for (const asset of originalAssets) {
          if (!asset.figmaId) {
            await transaction.rollback();
            return reject(new Error(`Asset '${asset.assetName}' (ID: ${asset.assetId}) is missing a figmaId.`));
          }
        }

        const campaignData: CreationAttributes<Campaign> = {
          campaignName: data.campaignname,
          description: data.description,
          fromDate: new Date(data.fromdate),
          toDate: new Date(data.todate),
          templateId: template.templateId,
          verticalId: template.verticalId,
          status: 'draft',
        };

        const newCampaign = await CampaignDAO.createCampaign(campaignData, transaction);

        // Clone assets in Figma
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
        logger.info(`Campaign created successfully: ${newCampaign.campaignName} (ID: ${newCampaign.campaignId})`);

        resolve({
          campaignId: newCampaign.campaignId,
          campaignname: newCampaign.campaignName,
          description: newCampaign.description,
          fromdate: newCampaign.fromDate,
          todate: newCampaign.toDate,
          verticalId: newCampaign.verticalId,
          templateId: newCampaign.templateId,
          assets: createdAssets.map(asset => asset.assetId),
        });
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
        });
      } catch (error: any) {
      }
      logger.info(`Fetched campaign by ID: ${campaignId}`);
    });
  }

public async uploadImage(
  campaignId: number,
  file: Express.Multer.File
): Promise<{ campaignId: number; filename: string; s3Key: string }> {
  if (!campaignId) {
    return Promise.reject(new Error('campaignId is required'));
  }

  if (!file) {
    return Promise.reject(new Error('Image file is required'));
  }

  const s3Key = `campaigns/${campaignId}/images/requests/${file.originalname}`;
  const bucket = process.env.IMAGE_BUCKET;

  if (!bucket) {
    logger.error('IMAGE_BUCKET environment variable is not set');
    return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
  }

  try {
    const fileBuffer = await fs.readFile(file.path);
    logger.info(`Successfully read file ${file.originalname}`);
    await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload image';
    return Promise.reject(new Error(message));
  }
  try {
    await fs.unlink(file.path);
    logger.info(`Deleted local image file: ${file.originalname}`);
  } catch (unlinkErr) {
    logger.error(`Attempting to delete local file failed: ${file.path}`);
  }
  return { campaignId, filename: file.originalname, s3Key };
}

public async uploadCSV(
  campaignId: number,
  file: Express.Multer.File
): Promise<{ campaignId: number; filename: string; s3Key: string }> {
  if (!campaignId) {
    return Promise.reject(new Error('campaignId is required'));
  }

  if (!file) {
    return Promise.reject(new Error('CSV file is required'));
  }

  const s3Key = `campaigns/${campaignId}/csv/${file.originalname}`;
  const bucket = process.env.IMAGE_BUCKET;

  if (!bucket) {
    logger.error('IMAGE_BUCKET environment variable is not set');
    return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
  }

  try {
    const fileBuffer = await fs.readFile(file.path);
    logger.info(`Successfully read file ${file.originalname}`);
    await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload CSV';
    return Promise.reject(new Error(message));
  }
  try {
    await fs.unlink(file.path);
    logger.info(`Deleted local file: ${file.originalname}`);
  } catch (unlinkErr) {
    logger.error(`Failed to delete local file ${file.path}: ${(unlinkErr as Error).message}`);
  }
  return { campaignId, filename: file.originalname, s3Key };
}
public async uploadExportedImage(
  campaignId: number,
  requestId: number,
  file: Express.Multer.File
): Promise<{ campaignId: number;requestId: number; filename: string; s3Key: string }> {
  if (!campaignId) {
    return Promise.reject(new Error('campaignId is required'));
  }

  if (!requestId) {
    return Promise.reject(new Error('requestId is required'));
  }

  if (!file) {
    return Promise.reject(new Error('Image file is required'));
  }

  const s3Key = `campaigns/${campaignId}/images/exported/${requestId}/${file.originalname}`;
  const bucket = process.env.IMAGE_BUCKET;

  if (!bucket) {
    logger.error('IMAGE_BUCKET environment variable is not set');
    return Promise.reject(new Error('IMAGE_BUCKET environment variable is not set'));
  }

  try {
    const fileBuffer = await fs.readFile(file.path);
    logger.info(`Successfully read exported image: ${file.originalname}`);
    await s3Service.putObject(bucket, s3Key, fileBuffer, file.mimetype);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload exported image';
    return Promise.reject(new Error(message));
  }
  try {
    await fs.unlink(file.path);
    logger.info(`Deleted local exported image: ${file.originalname}`);
  } catch (unlinkErr) {
    logger.error(`Failed to delete local file: ${file.path}`);
  }
  return { campaignId, requestId, filename: file.originalname, s3Key };
}
}
export default new CampaignService(); 
