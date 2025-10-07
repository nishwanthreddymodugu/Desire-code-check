import SearchClient from '../clients/search.client';
import { CampaignDocument } from '../interfaces/search.interface';
import createLogger from '../config/logger';
const logger = createLogger(module);

class SearchService {

    public async createCampaignIndex(): Promise<void> {
        try {
            logger.info('Manager: Telling the Specialist to create the index...');
            await SearchClient.createCampaignIndex();
        } catch (error) {
            logger.error('Failed to create campaign index:', error);
            throw new Error(`Failed to create campaign index: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    public async addCampaignToIndex(campaignData: CampaignDocument): Promise<void> {
        try {
            logger.info(`Manager: Telling the Specialist to add campaign ${campaignData.campaignId}...`);
            await SearchClient.addOrUpdateCampaign(campaignData);
        } catch (error) {
            logger.error(`Failed to add campaign ${campaignData.campaignId} to index:`, error);
            throw new Error(`Failed to add campaign to index: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Takes simple search terms (like a word or a status) and builds a
     * complex, powerful search plan for Elasticsearch.
     * @param queryParams The simple search terms from the user's request.
     */
    public async search(queryParams: any): Promise<any[]> {
        try {
            const { q, fromdate, todate, verticalId, status } = queryParams;
            // Basic validation/coercion of inputs
            let verticalIdNumber: number | undefined;
            if (verticalId !== undefined) {
                const n = Number(verticalId);
                if (!Number.isFinite(n)) {
                    throw new Error("Validation failed: 'verticalId' must be a number.");
                }
                verticalIdNumber = n;
            }
            let fromDateObj: Date | undefined;
            let toDateObj: Date | undefined;
            if (fromdate !== undefined) {
                const d = new Date(fromdate);
                if (isNaN(d.getTime())) {
                    throw new Error("Validation failed: 'fromdate' is not a valid date.");
                }
                fromDateObj = d;
            }
            if (todate !== undefined) {
                const d = new Date(todate);
                if (isNaN(d.getTime())) {
                    throw new Error("Validation failed: 'todate' is not a valid date.");
                }
                toDateObj = d;
            }
            if (fromDateObj && toDateObj && fromDateObj > toDateObj) {
                throw new Error("Validation failed: 'fromdate' cannot be later than 'todate'.");
            }
            const mustClauses: object[] = []; // These are for "fuzzy" text search.
            const filterClauses: object[] = []; // These are for exact, fast filtering.

            if (q) {
                mustClauses.push({
                    multi_match: {
                        query: q,
                        fields: ["campaignname", "description","verticalName", "templateName", "createdByName"],
                        fuzziness: "AUTO" 
                    }
                });
            }

            // If the user provided a 'status' filter (like "active")...
            if (status) {
                filterClauses.push({ term: { "status": status } });
            }
            if (verticalIdNumber !== undefined) {
                filterClauses.push({ term: { "verticalId": verticalIdNumber } });
            }
            const fromDateRange: any = {};
            if (fromDateObj) fromDateRange.gte = fromDateObj;
            if (toDateObj) fromDateRange.lte = toDateObj;
            if (Object.keys(fromDateRange).length > 0) {
                filterClauses.push({ range: { fromdate: fromDateRange } });
            }

            const esQuery = {
                index: 'campaign_search',
                // --- THIS IS THE FIX ---
                size: 10, // Add the limit to 10 results
                body: {
                    sort: [ // Add the sort order to get the most recent first
                        { createdAt: { order: "desc" } }
                    ],
                    // --------------------
                    query: {
                        bool: {
                            must: mustClauses.length > 0 ? mustClauses : { match_all: {} },
                            filter: filterClauses
                        }
                    }
                }
            };
            logger.info('Executing Elasticsearch query', { query: esQuery.body });
            // --------------------
            
            const results = await SearchClient.searchCampaigns({
                index: 'campaign_search',
                body: esQuery.body
            });
            
            return results.hits.hits.map((hit: any) => hit._source);
        } catch (error) {
            logger.error('Search operation failed:', error);
            // Re-throw validation errors as-is, but wrap other errors
            if (error instanceof Error && error.message.includes('Validation failed:')) {
                throw error;
            }
            throw new Error(`Search operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export default new SearchService();