import SearchClient from '../clients/search.client';
import { CampaignDocument, SearchQuery, SearchResponse, StatusAggregation, MonthlyAggregation, VerticalAggregation } from '../interfaces/search.interface.js';
import createLogger from '../config/logger';
const logger = createLogger(module);
class SearchService {

    public async createCampaignIndex(): Promise<void> {
        try {
            logger.info('Service: Creating Elasticsearch campaign index...');
            await SearchClient.createCampaignIndex();
        } catch (error) {
            logger.error('Failed to create campaign index:', error);
            throw new Error(`Failed to create campaign index: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    public async addCampaignToIndex(campaignData: CampaignDocument): Promise<void> {
        try {
            logger.info(`Service: Indexing campaign ${campaignData.campaignId}...`);
            await SearchClient.addOrUpdateCampaign(campaignData);
        } catch (error) {
            logger.error(`Failed to add campaign ${campaignData.campaignId} to index:`, error);
            throw new Error(`Failed to add campaign to index: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * @param queryParams The strongly-typed search parameters, already validated by the Route Handler.
     */
    public async search(queryParams: SearchQuery): Promise<SearchResponse> {
        try {
            const { q, fromdate, todate, verticalId, status, createdBy, createdAtFrom, createdAtTo } = queryParams;
            
            const mustClauses: object[] = [];
            const filterClauses: object[] = [];

            if (q) {
                mustClauses.push({
                    multi_match: { query: q, fields: ["campaignname", "description", "verticalName", "templateName", "createdByName"], fuzziness: "AUTO" }
                });
            }
            if (status) filterClauses.push({ term: { "status": status } });
            if (verticalId) filterClauses.push({ term: { "verticalId": verticalId } });
            if (createdBy) filterClauses.push({ term: { "createdByName.keyword": createdBy }});

            const fromDateRange: any = {};
            if (fromdate) fromDateRange.gte = fromdate;
            if (todate) fromDateRange.lte = todate;
            if (Object.keys(fromDateRange).length > 0) {
                filterClauses.push({ range: { fromdate: fromDateRange } });
            }
            
            const createdAtRange: any = {};
            if (createdAtFrom) createdAtRange.gte = createdAtFrom;
            if (createdAtTo) createdAtRange.lte = createdAtTo;
            if (Object.keys(createdAtRange).length > 0) {
                filterClauses.push({ range: { createdAt: createdAtRange } });
            }

            const esQuery = {
                index: 'campaign_search',
                size: 25,
                body: {
                    sort: [{ createdAt: { order: "desc" } }],
                    query: {
                        bool: {
                            must: mustClauses.length > 0 ? mustClauses : { match_all: {} },
                            filter: filterClauses
                        }
                    },
                    aggs: {
                        campaigns_by_status: { terms: { field: "status" } },
                        campaigns_by_month: { date_histogram: { field: "createdAt", calendar_interval: "month", format: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" } },
                        campaigns_by_vertical: { terms: { field: "verticalName.keyword" } },
                        total_assets: { sum: { field: "assetCount" } }
                    }
                }
            };
            
            logger.info('Executing Elasticsearch query', { query: esQuery.body });
            const results = await SearchClient.searchCampaigns(esQuery);

            const statusAggs: StatusAggregation = {};
            results.aggregations?.campaigns_by_status?.buckets.forEach((b: { key: string; doc_count: number; }) => { statusAggs[b.key] = b.doc_count; });

            const monthlyAggs: MonthlyAggregation = {};
            results.aggregations?.campaigns_by_month?.buckets.forEach((b: { key_as_string: string; doc_count: number; }) => { monthlyAggs[b.key_as_string] = b.doc_count; });

            const verticalAggs: VerticalAggregation = {};
            results.aggregations?.campaigns_by_vertical?.buckets.forEach((b: { key: string; doc_count: number; }) => { verticalAggs[b.key] = b.doc_count; });
            
            return {
                total_campaigns: results.hits.total.value,
                campaigns: results.hits.hits.map((hit: any) => hit._source),
                aggregations: {
                    campaigns_by_status: statusAggs,
                    campaigns_by_month: monthlyAggs,
                    campaigns_by_vertical: verticalAggs,
                    total_assets: results.aggregations?.total_assets?.value || 0,
                }
            };

        } catch (error: any) {

            logger.error('Search operation failed:', { error: error.meta?.body || error });

            if (error.meta?.body?.error?.type === 'index_not_found_exception') {

                throw { status: 503, message: 'The search service is temporarily unavailable. Please try again shortly.' };
            }

            throw { status: 500, message: `Search operation failed: ${error.message || 'Unknown Elasticsearch error'}` };
        }
    }
}

export default new SearchService();