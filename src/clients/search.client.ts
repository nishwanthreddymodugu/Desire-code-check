import { esClient } from '../config/elasticsearch';
import { CampaignDocument } from '../interfaces/search.interface';


const CAMPAIGN_INDEX = 'campaign_search';


class SearchClient {
    
    /**
     * Creates the main "card catalog" (the index) if it doesn't already exist.
     * This is like building the empty library shelves for the first time.
     */
    public async createCampaignIndex(): Promise<void> {
        const indexExists = await esClient.indices.exists({ index: CAMPAIGN_INDEX });
        if (!indexExists) {
            await esClient.indices.create({ index: CAMPAIGN_INDEX });
        }
    }

    /**
     * Adds a "catalog card" (a campaign document) to the library.
     * If a card with the same ID already exists, it just updates it.
     * @param document The campaign data to be saved.
     */
    public async addOrUpdateCampaign(document: CampaignDocument): Promise<void> {
        await esClient.index({
            index: CAMPAIGN_INDEX,
            id: document.campaignId.toString(),
            document: document,
            refresh: true, // Make this change searchable immediately
        });
    }

    /**
     * Takes a fully prepared search plan and executes it.
     * @param query The complex search plan created by the "Manager" (the Service).
     */
    public async searchCampaigns(query: Record<string, any>): Promise<any> {
        // Send the search query to Elasticsearch and return the raw results.
        return esClient.search(query);
    }
}

export default new SearchClient();