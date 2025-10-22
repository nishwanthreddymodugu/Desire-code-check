import { Op } from "sequelize";
import { sequelize } from "../config/database";
import CampaignDAO from "../daos/campaign.dao";
import SearchClient from "../clients/search.client";
import { CampaignDocument } from "../interfaces/search.interface";
import createlogger from "../config/logger";
const logger = createlogger(module);

const USAGE_INSTRUCTIONS = `
Usage:
  - To index all campaigns:        npm run index:campaigns
  - To index for a date range:     npm run index:campaigns YYYY-MM-DD YYYY-MM-DD
`;

async function runIndexing() {
  console.time("Total Indexing Time");
  logger.info("--- Starting Bulk Campaign Indexing ---");

  try {
    const args = process.argv.slice(2);
    const whereClause: any = {};

    if (args.length > 0 && args.length !== 2) {
        throw new Error(`Invalid number of arguments. Expected 0 or 2, but got ${args.length}.${USAGE_INSTRUCTIONS}`);
    }
    if (args.length === 2) {
      const [fromDate, toDate] = args;
      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error("Invalid date format provided. Please use YYYY-MM-DD.");
      }
      if (from > to) {
        throw new Error(`Invalid date range: The start date cannot be later than the end date.${USAGE_INSTRUCTIONS}`);
    }
      logger.info(
        `Indexing campaigns active between ${fromDate} and ${toDate}`
      );

      whereClause.fromDate = { [Op.lte]: to };
      whereClause.toDate = { [Op.gte]: from };
    } else {
      logger.info("No date range provided. Indexing all campaigns.");
    }

    const campaignsToIndex = await CampaignDAO.findAllForIndexing({
      where: whereClause,
    });
    if (campaignsToIndex.length === 0) {
      logger.info(
        "No campaigns found in the specified date range to index. Exiting."
      );
      process.exit(0);
    }
    logger.info(`Found ${campaignsToIndex.length} campaigns to index.`);

    const documents: CampaignDocument[] = campaignsToIndex.map((campaign) => {
      const createdByName = campaign.creator!.name;
      const assetIds = campaign.assets ? campaign.assets.map((a) => a.assetId) : [];
      return {
        campaignId: campaign.campaignId,
        campaignname: campaign.campaignName,
        description: campaign.description,
        status: campaign.status,
        fromdate: campaign.fromDate,
        todate: campaign.toDate,
        verticalId: campaign.verticalId,
        templateId: campaign.templateId,
        assets: assetIds,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        verticalName: campaign.vertical!.verticalName, 
        templateName: campaign.template!.templateName,
        createdByuserId: campaign.createdBy!,
        createdByName: createdByName,
        assetCount: assetIds.length
      };
    });

    const bulkResponse = await SearchClient.bulkIndexCampaigns(documents);

    let successCount = 0;
    let errorCount = 0;
    if (bulkResponse.items) {
      bulkResponse.items.forEach((item: any) => {
        if (item.index && item.index.error) {
          logger.error(
            `Failed to index campaign ID ${item.index._id}: ${item.index.error.reason}`
          );
          errorCount++;
        } else {
          successCount++;
        }
      });
    }
    logger.info(`--- Bulk Indexing Complete ---`);
    logger.info(`Successfully indexed: ${successCount}`);
    logger.info(`Failed to index: ${errorCount}`);

    console.timeEnd("Total Indexing Time");
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error(
      "A critical error occurred during the bulk indexing process:",
      error
    );
    console.timeEnd("Total Indexing Time");
    await sequelize.close();
    process.exit(1);
  }
}

runIndexing();