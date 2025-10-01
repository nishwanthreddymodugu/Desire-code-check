import { esClient } from '../config/elasticsearch';
import { CampaignDocument } from '../interfaces/search.interface';
import createLogger from '../config/logger';

const logger = createLogger(module);

const CAMPAIGN_INDEX = 'campaign_search';
class SearchClient {
    
    public async createCampaignIndex(): Promise<void> {
        try {
        const indexExists = await esClient.indices.exists({ index: CAMPAIGN_INDEX });
        if (!indexExists) {
                await esClient.indices.create({ index: CAMPAIGN_INDEX });
                logger.info(`Campaign index created successfully.`);
            } else {
                logger.info(`Campaign index already exists.`);
            }
        } catch (error) {
            logger.error(`Failed to create campaign index:`, error);
            throw error;
        }
    }

    /**
     * Adds a "catalog card" (a campaign document) to the library.
     * If a card with the same ID already exists, it just updates it.
     * @param document The campaign data to be saved.
     */
    public async addOrUpdateCampaign(document: CampaignDocument): Promise<void> {
        try {
        await esClient.index({
            index: CAMPAIGN_INDEX,
            id: document.campaignId.toString(),
            document: document,
            refresh: true, // Make this change searchable immediately
        });
        } catch (error) {
            logger.error(`Failed to add/update campaign:`, error);
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
}

export default new SearchClient();

// import { esClient } from '../config/elasticsearch.js';
// import { CampaignDocument } from '../interfaces/search.interface.js';
// import createLogger from '../config/logger.js';
// const logger = createLogger(module);
// const CAMPAIGN_INDEX = 'campaign_search';

// /**
//  * This class handles all direct communication with Elasticsearch.
//  * It now includes try/catch blocks to gracefully handle any potential
//  * network or API errors from the Elasticsearch service.
//  */
// class SearchClient {
    
//     public async createCampaignIndex(): Promise<void> {
//         try {
//             const indexExists: boolean = await esClient.indices.exists({ index: CAMPAIGN_INDEX });
//             if (!indexExists) {
//                 logger.info(`[SearchClient] Index '${CAMPAIGN_INDEX}' does not exist. Creating...`);
//                 await esClient.indices.create({ index: CAMPAIGN_INDEX });
//                 logger.info(`[SearchClient] Index '${CAMPAIGN_INDEX}' created successfully.`);
//             } else {
//                 logger.info(`[SearchClient] Index '${CAMPAIGN_INDEX}' already exists.`);
//             }
//         } catch (error) {
//             logger.error('[SearchClient] Error creating campaign index:', error);
//             // Re-throw the error to be caught by the service layer.
//             throw error;
//         }
//     }

//     public async addOrUpdateCampaign(document: CampaignDocument): Promise<void> {
//         try {
//             await esClient.index({
//                 index: CAMPAIGN_INDEX,
//                 id: document.campaignId.toString(),
//                 document: document,
//                 refresh: true,
//             });
//         } catch (error) {
//             logger.error(`[SearchClient] Error adding/updating document with ID ${document.campaignId}:`, error);
//             throw error;
//         }
//     }

//     public async searchCampaigns(query: Record<string, any>): Promise<any> {
//         try {
//             const results = await esClient.search(query);
//             return results;
//         } catch (error) {
//             logger.error('[SearchClient] Error executing search query:', error);
//             throw error;
//         }
//     }
// }

// export default new SearchClient();