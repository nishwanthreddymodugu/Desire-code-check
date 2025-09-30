import CampaignService from '../campaign.service';
import CampaignDAO from '../../daos/campaign.dao';
import TemplateDAO from '../../daos/template.dao';
import AssetDAO from '../../daos/asset.dao';
import figmaService from '../figma.service';
import { sequelize } from '../../config/database';

jest.mock('../../config/database', () => ({
  __esModule: true,
  sequelize: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../daos/campaign.dao', () => ({
  __esModule: true,
  default: {
    findByName: jest.fn(),
    createCampaign: jest.fn(),
    bulkCreateCampaignAssets: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
  },
}));

jest.mock('../../daos/template.dao', () => ({
  __esModule: true,
  default: {
    save: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock('../../daos/asset.dao', () => ({
  __esModule: true,
  default: {
    save: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
  },
}));

jest.mock('../figma.service', () => ({
  __esModule: true,
  default: {
    cloneFile: jest.fn(),
    updateFile: jest.fn(),
  },
}));

const mockedSequelize = sequelize as unknown as {
  transaction: jest.Mock;
};

const mockedCampaignDAO = CampaignDAO as unknown as {
  findByName: jest.Mock;
  createCampaign: jest.Mock;
  bulkCreateCampaignAssets: jest.Mock;
  findById: jest.Mock;
  list: jest.Mock;
};

const mockedTemplateDAO = TemplateDAO as unknown as {
  save: jest.Mock;
  list: jest.Mock;
  findById: jest.Mock;
};

const mockedAssetDAO = AssetDAO as unknown as {
  save: jest.Mock;
  list: jest.Mock;
  findById: jest.Mock;
  findByName: jest.Mock;
};

const mockedFigmaService = figmaService as unknown as {
  cloneFile: jest.Mock;
  updateFile: jest.Mock;
};

describe('CampaignService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCampaignDAO.findByName.mockResolvedValue(null);
  });

  const createTransactionMock = () => ({
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  });

  describe('create', () => {
    const input = {
      campaignname: 'New Launch',
      description: 'desc',
      fromdate: '2024-01-01',
      todate: '2024-01-31',
      verticalId: 2,
      templateId: 5,
      assets: [11, 12],
    };

    it('creates a campaign and clones assets when validation passes', async () => {
      const transaction = createTransactionMock();
      mockedSequelize.transaction.mockResolvedValueOnce(transaction);
      mockedTemplateDAO.findById.mockResolvedValueOnce({ templateId: 5, verticalId: 2 });
      mockedAssetDAO.list.mockResolvedValueOnce([
        { assetId: 11, assetName: 'Hero', figmaId: 'figma-11' },
        { assetId: 12, assetName: 'CTA', figmaId: 'figma-12' },
      ]);
      mockedCampaignDAO.createCampaign.mockResolvedValueOnce({
        campaignId: 99,
        campaignName: 'New Launch',
        description: 'desc',
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-01-31'),
        templateId: 5,
        verticalId: 2,
      });
      mockedFigmaService.cloneFile
        .mockResolvedValueOnce({ clonedFileId: 'clone-11' })
        .mockResolvedValueOnce({ clonedFileId: 'clone-12' });
      mockedCampaignDAO.bulkCreateCampaignAssets.mockResolvedValueOnce([
        { assetId: 11 },
        { assetId: 12 },
      ]);

      const result = await CampaignService.create(input);

      expect(mockedCampaignDAO.createCampaign).toHaveBeenCalled();
      expect(mockedCampaignDAO.bulkCreateCampaignAssets).toHaveBeenCalledWith(
        [
          {
            campaignId: 99,
            assetId: 11,
            assetName: 'Hero',
            clonedFigmaId: 'clone-11',
          },
          {
            campaignId: 99,
            assetId: 12,
            assetName: 'CTA',
            clonedFigmaId: 'clone-12',
          },
        ],
        transaction
      );
      expect(transaction.commit).toHaveBeenCalledTimes(1);
      expect(transaction.rollback).not.toHaveBeenCalled();
      expect(result).toEqual({
        campaignId: 99,
        campaignname: 'New Launch',
        description: 'desc',
        fromdate: new Date('2024-01-01'),
        todate: new Date('2024-01-31'),
        verticalId: 2,
        templateId: 5,
        assets: [11, 12],
      });
    });

    it('rolls back when the template cannot be found', async () => {
      const transaction = createTransactionMock();
      mockedSequelize.transaction.mockResolvedValueOnce(transaction);
      mockedTemplateDAO.findById.mockResolvedValueOnce(null);
      mockedAssetDAO.list.mockResolvedValueOnce([
        { assetId: 11, assetName: 'Hero', figmaId: 'figma-11' },
        { assetId: 12, assetName: 'CTA', figmaId: 'figma-12' },
      ]);

      await expect(CampaignService.create(input)).rejects.toThrow(
        "Template with ID '5' does not exist."
      );
      expect(transaction.rollback).toHaveBeenCalledTimes(1);
      expect(transaction.commit).not.toHaveBeenCalled();
    });

    it('rolls back when the template belongs to another vertical', async () => {
      const transaction = createTransactionMock();
      mockedSequelize.transaction.mockResolvedValueOnce(transaction);
      mockedTemplateDAO.findById.mockResolvedValueOnce({ templateId: 5, verticalId: 9 });
      mockedAssetDAO.list.mockResolvedValueOnce([
        { assetId: 11, assetName: 'Hero', figmaId: 'figma-11' },
        { assetId: 12, assetName: 'CTA', figmaId: 'figma-12' },
      ]);

      await expect(CampaignService.create(input)).rejects.toThrow(
        "Template '5' does not belong to Vertical '2'."
      );
      expect(transaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('fails when any asset id is missing', async () => {
      const transaction = createTransactionMock();
      mockedSequelize.transaction.mockResolvedValueOnce(transaction);
      mockedTemplateDAO.findById.mockResolvedValueOnce({ templateId: 5, verticalId: 2 });
      mockedAssetDAO.list.mockResolvedValueOnce([
        { assetId: 11, assetName: 'Hero', figmaId: 'figma-11' },
      ]);

      await expect(CampaignService.create(input)).rejects.toThrow(
        'These asset IDs do not exist: 12.'
      );
      expect(transaction.rollback).toHaveBeenCalledTimes(1);
    });

    it('fails when an asset is missing a figmaId', async () => {
      const transaction = createTransactionMock();
      mockedSequelize.transaction.mockResolvedValueOnce(transaction);
      mockedTemplateDAO.findById.mockResolvedValueOnce({ templateId: 5, verticalId: 2 });
      mockedAssetDAO.list.mockResolvedValueOnce([
        { assetId: 11, assetName: 'Hero', figmaId: 'figma-11' },
        { assetId: 12, assetName: 'CTA', figmaId: null },
      ]);

      await expect(CampaignService.create(input)).rejects.toThrow(
        "Asset 'CTA' (ID: 12) is missing a figmaId."
      );
      expect(transaction.rollback).toHaveBeenCalledTimes(1);
    });
  });

  describe('list', () => {
    it('applies filters and maps results', async () => {
      mockedCampaignDAO.list.mockResolvedValueOnce([
        {
          campaignId: 1,
          campaignName: 'Spring',
          fromDate: new Date('2024-02-01'),
          toDate: new Date('2024-02-28'),
          status: 'draft',
          verticalId: 2,
          templateId: 5,
        },
      ]);

      const filters = {
        status: 'draft',
        fromdate: '2024-01-01',
        todate: '2024-12-31',
        templateId: 5,
        createdAtFrom: '2024-01-01',
        createdAtTo: '2024-03-31',
        verticalId: 2,
      };

      const result = await CampaignService.list(filters);

      expect(mockedCampaignDAO.list).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'draft',
            templateId: 5,
            fromDate: expect.any(Object),
            toDate: expect.any(Object),
            createdAt: expect.any(Object),
          }),
          include: expect.any(Array),
        })
      );
      expect(result).toEqual([
        {
          campaignId: 1,
          campaignname: 'Spring',
          fromdate: new Date('2024-02-01'),
          todate: new Date('2024-02-28'),
          status: 'draft',
          verticalId: 2,
          templateId: 5,
        },
      ]);
    });
  });

  describe('getById', () => {
    it('throws when a campaign cannot be found', async () => {
      mockedCampaignDAO.findById.mockResolvedValueOnce(null);

      await expect(CampaignService.getById(99)).rejects.toThrow('Campaign not found');
    });

    it('maps the campaign with its assets', async () => {
      mockedCampaignDAO.findById.mockResolvedValueOnce({
        campaignId: 7,
        campaignName: 'Spring',
        description: 'desc',
        status: 'draft',
        fromDate: new Date('2024-02-01'),
        toDate: new Date('2024-02-28'),
        verticalId: 2,
        templateId: 5,
        assets: [
          { assetId: 1 },
          { assetId: 2 },
        ],
      });

      const result = await CampaignService.getById(7);

      expect(result).toEqual({
        campaignId: 7,
        campaignname: 'Spring',
        description: 'desc',
        status: 'draft',
        fromdate: new Date('2024-02-01'),
        todate: new Date('2024-02-28'),
        verticalId: 2,
        templateId: 5,
        assets: [1, 2],
      });
    });
  });
});


// // src/services/__tests__/campaign.service.test.ts

// import CampaignService from '../campaign.service';
// import CampaignDAO from '../../daos/campaign.dao';
// import TemplateDAO from '../../daos/template.dao';
// import AssetDAO from '../../daos/asset.dao';
// import figmaService from '../figma.service';
// import { sequelize } from '../../config/database';
// import { CampaignIn } from '../../interfaces/campaign.interface';
// import { Template } from '../../models/template';
// import { Asset } from '../../models/asset';
// import { Campaign } from '../../models/campaign';
// import { CampaignAsset } from '../../models/campaignasset';

// // --- Mock Setup ---
// jest.mock('../../config/database');
// jest.mock('../../daos/campaign.dao');
// jest.mock('../../daos/template.dao');
// jest.mock('../../daos/asset.dao');
// jest.mock('../figma.service');

// const mockedSequelize = sequelize as jest.Mocked<typeof sequelize>;
// const mockedCampaignDAO = CampaignDAO as jest.Mocked<typeof CampaignDAO>;
// const mockedTemplateDAO = TemplateDAO as jest.Mocked<typeof TemplateDAO>;
// const mockedAssetDAO = AssetDAO as jest.Mocked<typeof AssetDAO>;
// const mockedFigmaService = figmaService as jest.Mocked<typeof figmaService>;


// // --- Test Suite ---

// describe('CampaignService', () => {

//   const createTransactionMock = () => ({
//     commit: jest.fn(),
//     rollback: jest.fn(),
//   });

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('create', () => {
//     const input: CampaignIn = {
//       campaignname: 'New Launch',
//       description: 'desc',
//       fromdate: '2024-01-01',
//       todate: '2024-01-31',
//       verticalId: 2,
//       templateId: 5,
//       assets: [11, 12],
//     };

//     it('should create a campaign successfully when all validations pass', async () => {
//       // ARRANGE
//       const transaction = createTransactionMock();
//       mockedSequelize.transaction.mockResolvedValue(transaction as any);
//       mockedCampaignDAO.findByName.mockResolvedValue(null);
//       mockedTemplateDAO.findById.mockResolvedValue({ templateId: 5, verticalId: 2 } as Template);
//       mockedAssetDAO.list.mockResolvedValue([
//         { assetId: 11, assetName: 'Hero', figmaId: 'figma-11' },
//         { assetId: 12, assetName: 'CTA', figmaId: 'figma-12' },
//       ] as Asset[]);
//       mockedCampaignDAO.createCampaign.mockResolvedValue({ campaignId: 99 } as Campaign);
//       mockedFigmaService.cloneFile.mockResolvedValue({ clonedFileId: 'cloned-id' });
//       mockedCampaignDAO.bulkCreateCampaignAssets.mockResolvedValue([
//         { campaignId: 99, assetId: 11 },
//         { campaignId: 99, assetId: 12 },
//       ] as CampaignAsset[]);

//       // ACT
//       const result = await CampaignService.create(input);

//       // ASSERT
//       expect(result.campaignId).toBe(99);
//       expect(result.assets).toEqual([11, 12]);
//       expect(transaction.commit).toHaveBeenCalledTimes(1);
//       expect(transaction.rollback).not.toHaveBeenCalled();
//     });

//     it('should reject if the campaign name is empty', async () => {
//       // ARRANGE
//       const invalidInput = { ...input, campaignname: '   ' };

//       // ACT & ASSERT
//       await expect(CampaignService.create(invalidInput))
//         .rejects
//         .toEqual({ status: 400, message: "Validation failed: campaignname cannot be empty." });
      
//       expect(mockedSequelize.transaction).not.toHaveBeenCalled();
//     });

//     // ... (other 'create' failure tests like template not found, asset not found, etc.)
//   });

//   // --- THIS IS THE NEWLY ADDED CODE ---

//   describe('list', () => {
//     it('should apply all filters correctly and return a mapped list', async () => {
//       // ARRANGE: Set up the mock to return a sample campaign from the DAO
//       const mockCampaigns = [
//         {
//           campaignId: 1,
//           campaignName: 'Spring Sale',
//           fromDate: new Date('2024-02-01'),
//           toDate: new Date('2024-02-28'),
//           status: 'draft',
//           verticalId: 2,
//           templateId: 5,
//         }
//       ];
//       mockedCampaignDAO.list.mockResolvedValue(mockCampaigns as Campaign[]);

//       const filters = {
//         status: 'draft',
//         fromdate: '2024-01-01',
//         verticalId: 2,
//       };

//       // ACT: Call the list method with the filters
//       const result = await CampaignService.list(filters);

//       // ASSERT: Check that the DAO was called with the correct options and the result is formatted correctly
//       expect(mockedCampaignDAO.list).toHaveBeenCalledWith(expect.objectContaining({
//         where: expect.objectContaining({
//           status: 'draft',
//           fromDate: expect.any(Object),
//         }),
//         include: expect.any(Array),
//       }));
//       expect(result).toHaveLength(1);
//       expect(result[0].campaignname).toBe('Spring Sale');
//     });
//   });

//   describe('getById', () => {
//     it('should throw a "Not Found" error if the campaign does not exist', async () => {
//       // ARRANGE: Mock the DAO to return null, simulating a not-found scenario
//       mockedCampaignDAO.findById.mockResolvedValue(null);

//       // ACT & ASSERT: Expect the promise to reject with the correct error object
//       await expect(CampaignService.getById(999))
//         .rejects
//         .toEqual({ status: 404, message: 'Campaign not found' });
//     });

//     it('should return a correctly mapped campaign object when found', async () => {
//       // ARRANGE: Mock the DAO to return a full campaign object with its assets
//       const mockCampaign = {
//         campaignId: 7,
//         campaignName: 'Summer Launch',
//         description: 'desc',
//         status: 'active',
//         fromDate: new Date('2024-06-01'),
//         toDate: new Date('2024-06-30'),
//         verticalId: 1,
//         templateId: 1,
//         assets: [ // This is the array of associated Asset models
//           { assetId: 101 },
//           { assetId: 102 },
//         ],
//       };
//       mockedCampaignDAO.findById.mockResolvedValue(mockCampaign as any);

//       // ACT
//       const result = await CampaignService.getById(7);

//       // ASSERT: Check that the final output is formatted correctly
//       expect(result.campaignId).toBe(7);
//       expect(result.campaignname).toBe('Summer Launch');
//       expect(result.assets).toEqual([101, 102]); // Check that the assets array is just the IDs
//     });
//   });
//   // ------------------------------------
// });