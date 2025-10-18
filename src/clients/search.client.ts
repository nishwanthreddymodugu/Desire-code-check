import { esClient } from '../config/elasticsearch';
import { CampaignDocument } from '../interfaces/search.interface';
import createLogger from '../config/logger';

const logger = createLogger(module);

const CAMPAIGN_INDEX = 'campaign_search';
class SearchClient {

    public async createCampaignIndex(): Promise<void> {
        let indexExists = false;
        try {
            indexExists = await esClient.indices.exists({ index: CAMPAIGN_INDEX });
        } catch (err) {
            logger.error(`Failed to check if campaign index exists:`, err);
            throw err; 
        }

        // Create index if it does not exist
        if (!indexExists) {
            try {
                await esClient.indices.create({ index: CAMPAIGN_INDEX });
                logger.info(`Campaign index created successfully.`);
            } catch (err) {
                logger.error(`Failed to create campaign index:`, err);
                throw err;
            }
        } else {
            logger.info(`Campaign index already exists.`);
        }
    }

    /**
     * Adds a "catalog card" (a campaign document) to the library.
     * If a card with the same ID already exists, it just updates it.
     * @param document The campaign data to be saved.
     */
    public async addOrUpdateCampaign(document: CampaignDocument): Promise<void> {
        try {
            try {
                await esClient.index({
                    index: CAMPAIGN_INDEX,
                    id: document.campaignId.toString(),
                    document: document,
                    refresh: true, // Make this change searchable immediately
                });
            } catch (err) {
                logger.error(`Failed to index campaign document (ID: ${document.campaignId}):`, err);
                throw err; // rethrow to outer catch if needed
            }
        } catch (error) {
            logger.error(`Error in addOrUpdateCampaign:`, error);
            throw error;
        }
    }
    
    /**
     * Takes a fully prepared search plan and executes it.
     * @param query The complex search plan created by the "Manager" (the Service).
     */
    public async searchCampaigns(query: Record<string, any>): Promise<any> {
        try {
            return esClient.search(query);
        } catch (error) {
            logger.error(`Failed to search campaigns:`, error);
            throw error;
        }
    }
    /**
     * Indexes multiple campaign documents in a single, efficient bulk request.
     * @param documents An array of campaign documents to be indexed.
     */
    public async bulkIndexCampaigns(documents: CampaignDocument[]): Promise<any> {
        try {
            if (documents.length === 0) return;
            const operations = documents.flatMap(doc => [
                { index: { _index: CAMPAIGN_INDEX, _id: doc.campaignId.toString() } },
                doc
            ]);

            const bulkResponse = await esClient.bulk({ refresh: true, operations });
            return bulkResponse;

        } catch (error) {
            logger.error('[SearchClient] Error during bulk indexing:', error);
            throw error;
        }
    }
}


export default new SearchClient();