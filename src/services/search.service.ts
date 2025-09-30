import SearchClient from '../clients/search.client';
import { CampaignDocument } from '../interfaces/search.interface';
import createLogger from '../config/logger';
const logger = createLogger(module);

class SearchService {

    public async createCampaignIndex(): Promise<void> {
        logger.info('Manager: Telling the Specialist to create the index...');
        await SearchClient.createCampaignIndex();
    }
    
    public async addCampaignToIndex(campaignData: CampaignDocument): Promise<void> {
        logger.info(`Manager: Telling the Specialist to add campaign ${campaignData.campaignId}...`);
        await SearchClient.addOrUpdateCampaign(campaignData);
    }

    /**
     * Takes simple search terms (like a word or a status) and builds a
     * complex, powerful search plan for Elasticsearch.
     * @param queryParams The simple search terms from the user's request.
     */
    public async search(queryParams: any): Promise<any[]> {
        const { q, fromdate, todate, verticalId, status } = queryParams;
        
        const mustClauses: object[] = []; // These are for "fuzzy" text search.
        const filterClauses: object[] = []; // These are for exact, fast filtering.

        // If the user provided a general search term (like "summer sale")...
        if (q) {
            mustClauses.push({
                multi_match: {
                    query: q,
                    fields: ["campaignname", "description"],
                    fuzziness: "AUTO" // Allows for small typos
                }
            });
        }

        // If the user provided a 'status' filter (like "active")...
        if (status) {
            filterClauses.push({ term: { "status": status } });
        }
        if (verticalId) {
            filterClauses.push({ term: { "verticalId": Number(verticalId) } });
        }
        const fromDateRange: any = {};
        if (fromdate) fromDateRange.gte = new Date(fromdate);
        if (todate) fromDateRange.lte = new Date(todate);
        if (Object.keys(fromDateRange).length > 0) {
            filterClauses.push({ range: { fromdate: fromDateRange } });
        }

        // Combine all the small plan pieces into one master search plan.
        const esQuery = {
            index: 'campaign_search',
            body: {
                query: {
                    bool: {
                        must: mustClauses.length > 0 ? mustClauses : { match_all: {} },
                        filter: filterClauses
                    }
                }
            }
        };
        //logger.info(`Service: Executing Elasticsearch query: ${JSON.stringify({ esQuery: esQuery.body })}`);
        logger.info('Executing Elasticsearch query', { query: esQuery.body });
        // --------------------
        
        const results = await SearchClient.searchCampaigns({
            index: 'campaign_search',
            body: esQuery.body
        });
        
        return results.hits.hits.map((hit: any) => hit._source);
    }
}

export default new SearchService();