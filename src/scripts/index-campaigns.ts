// src/scripts/index-campaigns.ts
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import CampaignDAO from '../daos/campaign.dao';
import SearchClient from '../clients/search.client';
import { CampaignDocument } from '../interfaces/search.interface';
import createlogger from '../config/logger';
const logger = createlogger(module);

async function runIndexing() {
    console.time("Total Indexing Time");
    logger.info("--- Starting Bulk Campaign Indexing ---");

    try {
        // 1. Parse command-line arguments for the date range
        const args = process.argv.slice(2);
        const [fromDate, toDate] = args;
        const whereClause: any = {};

        if (fromDate && toDate) {
            logger.info(`Indexing campaigns active between ${fromDate} and ${toDate}`);
            const from = new Date(fromDate);
            const to = new Date(toDate);
            
            whereClause[Op.or] = [
                // Case 1: Campaign starts within the user's date range.
                { fromDate: { [Op.between]: [from, to] } },
                // Case 2: Campaign ends within the user's date range.
                { toDate: { [Op.between]: [from, to] } },
                // Case 3: Campaign completely envelops the user's date range.
                { [Op.and]: [{ fromDate: { [Op.lte]: from } }, { toDate: { [Op.gte]: to } }] }
            ];
        } else {
            logger.info("No date range provided. Indexing all campaigns.");
        }

        // 2. Fetch all necessary data from PostgreSQL in one go
        const campaignsToIndex = await CampaignDAO.findAllForIndexing({ where: whereClause });
        if (campaignsToIndex.length === 0) {
            logger.info("No campaigns found in the specified date range to index. Exiting.");
            process.exit(0);
        }
        logger.info(`Found ${campaignsToIndex.length} campaigns to index.`);

        // 3. Enrich the data to create the search documents
        const documents: CampaignDocument[] = campaignsToIndex.map(campaign => ({
            campaignId: campaign.campaignId,
            campaignname: campaign.campaignName,
            description: campaign.description,
            status: campaign.status,
            fromdate: campaign.fromDate,
            todate: campaign.toDate,
            verticalId: campaign.verticalId,
            templateId: campaign.templateId,
            assets: campaign.assets ? campaign.assets.map(a => a.assetId) : [],
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt,
            verticalName: campaign.vertical!.verticalName, // '!' asserts that the included model is not null
            templateName: campaign.template!.templateName,
            createdByuserId: campaign.createdBy!,
            createdByName: "User Name Here", // In a real app, you would join the User model to get this
        }));

        // 4. Send the documents to Elasticsearch for bulk indexing
        const bulkResponse = await SearchClient.bulkIndexCampaigns(documents);

        // 5. Log the results with item-by-item success/failure
        let successCount = 0;
        let errorCount = 0;
        if (bulkResponse.items) {
            bulkResponse.items.forEach((item: any) => {
                if (item.index && item.index.error) {
                    logger.error(`Failed to index campaign ID ${item.index._id}: ${item.index.error.reason}`);
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
        logger.error("A critical error occurred during the bulk indexing process:", error);
        console.timeEnd("Total Indexing Time");
        await sequelize.close();
        process.exit(1);
    }
}

runIndexing();