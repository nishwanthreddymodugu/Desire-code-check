import { FindOptions, Op, CreationAttributes } from 'sequelize';
import { sequelize } from '../config/database';
import CampaignDAO from '../daos/campaign.dao';
import TemplateDAO from '../daos/template.dao';
import AssetDAO from '../daos/asset.dao';
import { Campaign } from '../models/campaign';
import { Asset } from '../models/asset';
import { Template } from '../models/template';
import figmaService from './figma.service';
import { CampaignIn, CampaignCreateOut, CampaignListOut, CampaignGetOut } from '../interfaces/campaign.interface';

class CampaignService {

  public create(data: CampaignIn): Promise<CampaignCreateOut> {
    return new Promise(async (resolve, reject) => {
      const transaction = await sequelize.transaction();
      try {
        const [template, originalAssets] = await Promise.all([
          TemplateDAO.findById(data.templateId),
          AssetDAO.list({ where: { assetId: data.assets } }),
        ]);

        if (!template) {
          return reject(new Error(`Template with ID '${data.templateId}' does not exist.`));
        }
        if (template.verticalId !== data.verticalId) {
          return reject(new Error(`Template '${data.templateId}' does not belong to Vertical '${data.verticalId}'.`));
        }
        const foundAssetIds = originalAssets.map(a => a.assetId);
        const missingAssetIds = data.assets.filter(id => !foundAssetIds.includes(id));
        if (missingAssetIds.length > 0) {
          return reject(new Error(`These asset IDs do not exist: ${missingAssetIds.join(', ')}.`));
        }

        for (const asset of originalAssets) {
          if (!asset.figmaId) {
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
      } catch (error) {
        await transaction.rollback();
        reject(error);
      }
    });
  }

  public list(filters: any): Promise<CampaignListOut[]> {
    return new Promise(async (resolve, reject) => {
      try {
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

        resolve(campaigns.map(c => ({
          campaignId: c.campaignId,
          campaignname: c.campaignName,
          fromdate: c.fromDate,
          todate: c.toDate,
          status: c.status,
          verticalId: c.verticalId,
          templateId: c.templateId,
        })));
      } catch (error) {
        console.error('Error in CampaignService.list:', error);
        reject(error);
      }
    });
  }

  public getById(campaignId: number): Promise<CampaignGetOut> {
    return new Promise(async (resolve, reject) => {
      try {
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
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new CampaignService();
