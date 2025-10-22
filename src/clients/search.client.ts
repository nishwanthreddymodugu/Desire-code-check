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
                logger.info(`[SearchClient] Index '${CAMPAIGN_INDEX}' does not exist. Creating with explicit mappings...`);
                
                await esClient.indices.create({
                    index: CAMPAIGN_INDEX,
                    body: {
                        mappings: {
                            properties: {
                                campaignId: { type: 'integer' },
                                campaignname: { type: 'text' },
                                description: { type: 'text' },
                                status: { type: 'keyword' }, 
                                fromdate: { type: 'date' },
                                todate: { type: 'date' },
                                verticalId: { type: 'integer' },
                                templateId: { type: 'integer' },
                                verticalName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                                templateName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                                createdByName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                                createdAt: { type: 'date' },
                                updatedAt: { type: 'date' },
                                assetCount: { type: 'integer' }
                            }
                        }
                    }
                });
                logger.info(`[SearchClient] Index '${CAMPAIGN_INDEX}' created successfully.`);
            } else {
                logger.info(`[SearchClient] Index '${CAMPAIGN_INDEX}' already exists.`);
            }
        } catch (error: unknown) { 
            logger.error('[SearchClient] Error in createCampaignIndex:', { error });
            throw error;
        }
    }

    public async addOrUpdateCampaign(document: CampaignDocument): Promise<void> {
        try {
            await esClient.index({
                index: CAMPAIGN_INDEX,
                id: document.campaignId.toString(),
                document: document,
                refresh: true,
            });
        } catch (error: unknown) {
            logger.error(`[SearchClient] Error adding/updating document with ID ${document.campaignId}:`, { error });
            throw error;
        }
    }
    
    /**
     * @param query The complex search plan created by the "Manager" (the Service).
     */
    public async searchCampaigns(query: object): Promise<any> {
        try {
            const results = await esClient.search(query);
            return results;
        } catch (error: unknown) {
            logger.error(`[SearchClient] Failed to search campaigns:`, { error });
            throw error;
        }
    }

    /**
     * @param documents An array of campaign documents to be indexed.
     */
    public async bulkIndexCampaigns(documents: CampaignDocument[]): Promise<any> {
        try {
            if (documents.length === 0) return { items: [] }; // Return a consistent shape

            const operations = documents.flatMap(doc => [
                { index: { _index: CAMPAIGN_INDEX, _id: doc.campaignId.toString() } },
                doc
            ]);

            const bulkResponse = await esClient.bulk({ refresh: true, operations });
            return bulkResponse; // Return the response directly for easier processing in the script

        } catch (error: unknown) {
            logger.error('[SearchClient] Error during bulk indexing:', { error });
            throw error;
        }
    }
}

export default new SearchClient();