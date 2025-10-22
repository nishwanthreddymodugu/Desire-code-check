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
      const doc = { campaignId: 123, campaignname: 'Spring', status: 'active' } as any;

      await SearchService.addCampaignToIndex(doc);

      expect(mockedSearchClient.addOrUpdateCampaign).toHaveBeenCalledWith(doc);
    });
  });

  describe('search', () => {
    it('builds a multi_match clause when q is provided', async () => {
      mockedSearchClient.searchCampaigns.mockResolvedValueOnce({
        hits: { hits: [{ _source: { campaignId: 1, campaignname: 'A' } }] },
      });

      const params = { q: 'summer sale' };
      await SearchService.search(params);

      const calledArg = mockedSearchClient.searchCampaigns.mock.calls[0][0];
      const mustClauses = calledArg.body.query.bool.must;

      expect(Array.isArray(mustClauses)).toBe(true);
      expect(mustClauses[0]).toEqual({
        multi_match: {
          query: 'summer sale',
          fields: ['campaignname'], // or include 'description' if service uses it
          fuzziness: 'AUTO',
        },
      });
    });

    it('applies status, verticalId, and date range filters', async () => {
      mockedSearchClient.searchCampaigns.mockResolvedValueOnce({ hits: { hits: [] } });

      const params = {
        status: 'draft',
        verticalId: 3,
        fromdate: '2024-01-01',
        todate: '2024-12-31',
      };

      await SearchService.search(params);

      const filterClauses = mockedSearchClient.searchCampaigns.mock.calls[0][0].body.query.bool.filter;

      expect(filterClauses).toEqual(
        expect.arrayContaining([
          { term: { status: 'draft' } },
          { term: { verticalId: 3 } },
          expect.objectContaining({ range: expect.any(Object) }),
        ])
      );

      const rangeClause = filterClauses.find((c: any) => c.range);
      expect(rangeClause.range.fromdate.gte).toBeInstanceOf(Date);
      expect(rangeClause.range.fromdate.lte).toBeInstanceOf(Date);
    });

    it('uses match_all when no q is provided', async () => {
      mockedSearchClient.searchCampaigns.mockResolvedValueOnce({ hits: { hits: [] } });

      await SearchService.search({});

      const must = mockedSearchClient.searchCampaigns.mock.calls[0][0].body.query.bool.must;
      expect(must).toEqual({ match_all: {} });
    });

    it('maps search results correctly', async () => {
      mockedSearchClient.searchCampaigns.mockResolvedValueOnce({
        hits: {
          hits: [
            { _source: { campaignId: 1, campaignname: 'A' } },
            { _source: { campaignId: 2, campaignname: 'B' } },
          ],
        },
      });

      const result = await SearchService.search({ q: 'sale' });
      expect(result).toEqual([
        { campaignId: 1, campaignname: 'A' },
        { campaignId: 2, campaignname: 'B' },
      ]);
    });
  });
});
