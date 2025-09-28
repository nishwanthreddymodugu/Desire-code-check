import { FindOptions, Op, CreationAttributes } from "sequelize";
import { sequelize } from "../config/database";
import CampaignDAO from "../daos/campaign.dao";
import TemplateDAO from "../daos/template.dao";
import AssetDAO from "../daos/asset.dao";
import { Campaign } from "../models/campaign";
import { Template } from "../models/template";
import figmaService from "./figma.service";
import {
    CampaignIn,
    CampaignCreateOut,
    CampaignListOut,
    CampaignGetOut,
} from "../interfaces/campaign.interface";
import logger from "../config/logger"; // Winston logger

class CampaignService {
    public create(data: CampaignIn): Promise<CampaignCreateOut> {
        return new Promise(async (resolve, reject) => {
            const transaction = await sequelize.transaction();
            try {
                logger.info(`Creating campaign: ${data.campaignname}`);

                const [template, originalAssets] = await Promise.all([
                    TemplateDAO.findById(data.templateId),
                    AssetDAO.list({ where: { assetId: data.assets } }),
                ]);

                if (!template) {
                    await transaction.rollback();
                    return reject(
                        new Error(
                            `Template with ID '${data.templateId}' does not exist.`
                        )
                    );
                }
                if (template.verticalId !== data.verticalId) {
                    await transaction.rollback();
                    return reject(
                        new Error(
                            `Template '${data.templateId}' does not belong to Vertical '${data.verticalId}'.`
                        )
                    );
                }

                const foundAssetIds = originalAssets.map((a) => a.assetId);
                const missingAssetIds = data.assets.filter(
                    (id) => !foundAssetIds.includes(id)
                );
                if (missingAssetIds.length > 0) {
                    await transaction.rollback();
                    return reject(
                        new Error(
                            `These asset IDs do not exist: ${missingAssetIds.join(
                                ", "
                            )}.`
                        )
                    );
                }

                for (const asset of originalAssets) {
                    if (!asset.figmaId) {
                        await transaction.rollback();
                        return reject(
                            new Error(
                                `Asset '${asset.assetName}' (ID: ${asset.assetId}) is missing a figmaId.`
                            )
                        );
                    }
                }

                const campaignData: CreationAttributes<Campaign> = {
                    campaignName: data.campaignname,
                    description: data.description,
                    fromDate: new Date(data.fromdate),
                    toDate: new Date(data.todate),
                    templateId: template.templateId,
                    verticalId: template.verticalId,
                    status: "draft",
                };

                const newCampaign = await CampaignDAO.createCampaign(
                    campaignData,
                    transaction
                );
                logger.info(
                    `Campaign created with ID: ${newCampaign.campaignId}`
                );

                const clonePromises = originalAssets.map((asset) =>
                    figmaService.cloneFile(asset.figmaId!)
                );
                const clonedFigmaIds = await Promise.all(clonePromises);

                const campaignAssetsToCreate = originalAssets.map(
                    (asset, index) => ({
                        campaignId: newCampaign.campaignId,
                        assetId: asset.assetId,
                        assetName: asset.assetName,
                        clonedFigmaId: clonedFigmaIds[index].clonedFileId,
                    })
                );

                const createdAssets =
                    await CampaignDAO.bulkCreateCampaignAssets(
                        campaignAssetsToCreate,
                        transaction
                    );
                logger.info(
                    `Cloned and linked ${createdAssets.length} assets for campaign ID: ${newCampaign.campaignId}`
                );

                await transaction.commit();
                logger.info(
                    `Transaction committed for campaign ID: ${newCampaign.campaignId}`
                );

                resolve({
                    campaignId: newCampaign.campaignId,
                    campaignname: newCampaign.campaignName,
                    description: newCampaign.description,
                    fromdate: newCampaign.fromDate,
                    todate: newCampaign.toDate,
                    verticalId: newCampaign.verticalId,
                    templateId: newCampaign.templateId,
                    assets: createdAssets.map((asset) => asset.assetId),
                });
            } catch (error: any) {
                await transaction.rollback();
                logger.error(
                    `Transaction rolled back. Error creating campaign: ${error.message}`
                );
                reject(error);
            }
        });
    }

    public list(filters: any): Promise<CampaignListOut[]> {
        return new Promise(async (resolve, reject) => {
            try {
                logger.info(
                    `Listing campaigns with filters: ${JSON.stringify(filters)}`
                );
                const options: FindOptions = {
                    where: {},
                    include: [],
                    order: [["createdAt", "DESC"]],
                };
                const whereClause: any = {};

                if (filters.status) whereClause.status = filters.status;
                if (filters.fromdate)
                    whereClause.fromDate = {
                        [Op.gte]: new Date(filters.fromdate),
                    };
                if (filters.todate)
                    whereClause.toDate = { [Op.lte]: new Date(filters.todate) };
                if (filters.templateId)
                    whereClause.templateId = filters.templateId;
                if (filters.createdAtFrom)
                    whereClause.createdAt = {
                        [Op.gte]: new Date(filters.createdAtFrom),
                    };
                if (filters.createdAtTo)
                    whereClause.createdAt = {
                        ...whereClause.createdAt,
                        [Op.lte]: new Date(filters.createdAtTo),
                    };
                if (filters.verticalId) {
                    (options.include as any).push({
                        model: Template,
                        where: { verticalId: filters.verticalId },
                        required: true,
                    });
                }
                options.where = whereClause;

                const campaigns = await CampaignDAO.list(options);
                logger.info(`Fetched ${campaigns.length} campaigns`);

                resolve(
                    campaigns.map((c) => ({
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
                logger.error(`Error listing campaigns: ${error.message}`);
                reject(error);
            }
        });
    }

    public getById(campaignId: number): Promise<CampaignGetOut> {
        return new Promise(async (resolve, reject) => {
            try {
                logger.info(`Fetching campaign by ID: ${campaignId}`);
                const campaign = await CampaignDAO.findById(campaignId);
                if (!campaign) {
                    const msg = "Campaign not found";
                    logger.warn(msg);
                    return reject(new Error(msg));
                }

                resolve({
                    campaignId: campaign.campaignId,
                    campaignname: campaign.campaignName,
                    description: campaign.description,
                    status: campaign.status,
                    fromdate: campaign.fromDate,
                    todate: campaign.toDate,
                    verticalId: campaign.verticalId,
                    templateId: campaign.templateId,
                    assets: campaign.assets
                        ? campaign.assets.map((asset) => asset.assetId)
                        : [],
                });
            } catch (error: any) {
                logger.error(
                    `Error fetching campaign by ID ${campaignId}: ${error.message}`
                );
                reject(error);
            }
        });
    }
}

export default new CampaignService();
