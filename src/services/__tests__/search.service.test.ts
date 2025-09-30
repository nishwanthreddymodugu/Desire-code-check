import SearchService from '../search.service';
import SearchClient from '../../clients/search.client';

jest.mock('../../clients/search.client', () => ({
  __esModule: true,
  default: {
    createCampaignIndex: jest.fn(),
    addOrUpdateCampaign: jest.fn(),
    searchCampaigns: jest.fn(),
  },
}));

const mockedSearchClient = SearchClient as unknown as {
  createCampaignIndex: jest.Mock;
  addOrUpdateCampaign: jest.Mock;
  searchCampaigns: jest.Mock;
};

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCampaignIndex', () => {
    it('delegates to SearchClient.createCampaignIndex', async () => {
      mockedSearchClient.createCampaignIndex.mockResolvedValueOnce(undefined);

      await SearchService.createCampaignIndex();

      expect(mockedSearchClient.createCampaignIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe('addCampaignToIndex', () => {
    it('delegates to SearchClient.addOrUpdateCampaign with payload', async () => {
      mockedSearchClient.addOrUpdateCampaign.mockResolvedValueOnce(undefined);
      const doc = {
        campaignId: 123,
        campaignname: 'Spring',
        description: 'desc',
        status: 'active',
        fromdate: new Date('2024-02-01'),
        todate: new Date('2024-02-28'),
        verticalId: 2,
        templateId: 5,
      } as any;

      await SearchService.addCampaignToIndex(doc);

      expect(mockedSearchClient.addOrUpdateCampaign).toHaveBeenCalledWith(doc);
    });
  });

  describe('search', () => {
    it('builds a multi_match must clause when q is provided, and maps results', async () => {
      mockedSearchClient.searchCampaigns.mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: { campaignId: 1, campaignname: 'A' } },
            { _source: { campaignId: 2, campaignname: 'B' } },
          ],
        },
      });

      const params = { q: 'summer sale' };
      const result = await SearchService.search(params);

      expect(mockedSearchClient.searchCampaigns).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'campaign_search',
          body: expect.objectContaining({
            query: expect.objectContaining({
              bool: expect.objectContaining({
                must: expect.any(Array),
              }),
            }),
          }),
        })
      );
      // Ensure multi_match clause exists
      const calledArg = mockedSearchClient.searchCampaigns.mock.calls[0][0];
      const mustClauses = calledArg.body.query.bool.must;
      expect(Array.isArray(mustClauses)).toBe(true);
      expect(mustClauses[0]).toEqual(
        expect.objectContaining({
          multi_match: expect.objectContaining({
            query: 'summer sale',
            fields: ['campaignname', 'description'],
          }),
        })
      );

      expect(result).toEqual([
        { campaignId: 1, campaignname: 'A' },
        { campaignId: 2, campaignname: 'B' },
      ]);
    });

    it('applies status, verticalId and date range filters', async () => {
      mockedSearchClient.searchCampaigns.mockResolvedValueOnce({ hits: { hits: [] } });

      const params = {
        status: 'draft',
        verticalId: 3,
        fromdate: '2024-01-01',
        todate: '2024-12-31',
      };

      await SearchService.search(params);

      const calledArg = mockedSearchClient.searchCampaigns.mock.calls[0][0];
      const filterClauses = calledArg.body.query.bool.filter;

      // Expect term filters for status and verticalId
      expect(filterClauses).toEqual(
        expect.arrayContaining([
          { term: { status: 'draft' } },
          { term: { verticalId: 3 } },
          expect.objectContaining({ range: expect.any(Object) }),
        ])
      );

      // Validate range filter keys and values are present
      const rangeClause = filterClauses.find((c: any) => c.range);
      expect(rangeClause.range.fromdate.gte).toBeInstanceOf(Date);
      expect(rangeClause.range.fromdate.lte).toBeInstanceOf(Date);
    });

    it('uses match_all when no q is provided', async () => {
      mockedSearchClient.searchCampaigns.mockResolvedValueOnce({ hits: { hits: [] } });

      await SearchService.search({});

      const calledArg = mockedSearchClient.searchCampaigns.mock.calls[0][0];
      const must = calledArg.body.query.bool.must;

      // When no q, service passes an object { match_all: {} }
      expect(must).toEqual({ match_all: {} });
    });
  });
});


