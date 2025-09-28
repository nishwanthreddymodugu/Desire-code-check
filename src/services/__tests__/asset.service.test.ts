import AssetService from '../asset.service';
import AssetDAO from '../../daos/asset.dao';
import TemplateDAO from '../../daos/template.dao';
import VerticalDAO from '../../daos/vertical.dao';

jest.mock('../../daos/asset.dao', () => ({
  __esModule: true,
  default: {
    save: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
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

jest.mock('../../daos/vertical.dao', () => ({
  __esModule: true,
  default: {
    save: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
  },
}));

const mockedAssetDAO = AssetDAO as unknown as {
  save: jest.Mock;
  list: jest.Mock;
  findById: jest.Mock;
  findByName: jest.Mock;
};

const mockedTemplateDAO = TemplateDAO as unknown as {
  save: jest.Mock;
  list: jest.Mock;
  findById: jest.Mock;
};

const mockedVerticalDAO = VerticalDAO as unknown as {
  save: jest.Mock;
  list: jest.Mock;
  findById: jest.Mock;
};

describe('AssetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('requires an assetname', async () => {
      await expect(
        AssetService.save({ templateId: 1, verticalId: 1 } as any)
      ).rejects.toThrow('Validation failed: assetname is required.');
    });

    it('requires a templateId', async () => {
      await expect(
        AssetService.save({ assetname: 'Hero', verticalId: 1 } as any)
      ).rejects.toThrow('Validation failed: templateId is required.');
    });

    it('requires a verticalId', async () => {
      await expect(
        AssetService.save({ assetname: 'Hero', templateId: 1 } as any)
      ).rejects.toThrow('Validation failed: verticalId is required.');
    });

    it('rejects when the vertical is not found', async () => {
      mockedVerticalDAO.findById.mockResolvedValueOnce(null);

      await expect(
        AssetService.save({ assetname: 'Hero', templateId: 1, verticalId: 1 })
      ).rejects.toThrow("Vertical with ID '1' does not exist.");
    });

    it('rejects when the template is not found', async () => {
      mockedVerticalDAO.findById.mockResolvedValueOnce({ verticalId: 1, verticalName: 'Sales' });
      mockedTemplateDAO.findById.mockResolvedValueOnce(null);

      await expect(
        AssetService.save({ assetname: 'Hero', templateId: 1, verticalId: 1 })
      ).rejects.toThrow("Template with ID '1' does not exist.");
    });

    it('rejects when the template belongs to a different vertical', async () => {
      mockedVerticalDAO.findById.mockResolvedValueOnce({ verticalId: 1, verticalName: 'Sales' });
      mockedTemplateDAO.findById.mockResolvedValueOnce({
        templateId: 1,
        templateName: 'Email',
        verticalId: 2,
      });

      await expect(
        AssetService.save({ assetname: 'Hero', templateId: 1, verticalId: 1 })
      ).rejects.toThrow("Template 'Email' does not belong to Vertical 'Sales'.");
    });

    it('rejects when the asset name already exists on another asset', async () => {
      mockedVerticalDAO.findById.mockResolvedValueOnce({ verticalId: 1, verticalName: 'Sales' });
      mockedTemplateDAO.findById.mockResolvedValueOnce({
        templateId: 1,
        templateName: 'Email',
        verticalId: 1,
      });
      mockedAssetDAO.findByName.mockResolvedValueOnce({
        assetId: 2,
        assetName: 'Hero',
      });

      await expect(
        AssetService.save({ assetname: 'Hero', templateId: 1, verticalId: 1 })
      ).rejects.toThrow("Asset name 'Hero' already exists. Name must be unique.");
    });

    it('saves the asset when validation passes', async () => {
      mockedVerticalDAO.findById.mockResolvedValueOnce({ verticalId: 1, verticalName: 'Sales' });
      mockedTemplateDAO.findById.mockResolvedValueOnce({
        templateId: 1,
        templateName: 'Email',
        verticalId: 1,
      });
      mockedAssetDAO.findByName.mockResolvedValueOnce(null);
      mockedAssetDAO.save.mockResolvedValueOnce({
        assetId: 10,
        assetName: 'Hero',
        description: 'desc',
        figmaURL: 'url',
        figmaId: 'figma-1',
        templateId: 1,
        verticalId: 1,
      });

      const result = await AssetService.save({
        assetname: 'Hero',
        description: 'desc',
        figmaURL: 'url',
        figmaId: 'figma-1',
        templateId: 1,
        verticalId: 1,
      });

      expect(mockedAssetDAO.save).toHaveBeenCalledWith({
        assetId: undefined,
        assetName: 'Hero',
        description: 'desc',
        figmaURL: 'url',
        figmaId: 'figma-1',
        templateId: 1,
        verticalId: 1,
      });
      expect(result).toEqual({
        assetId: 10,
        assetname: 'Hero',
        description: 'desc',
        figmaURL: 'url',
        figmaId: 'figma-1',
        templateId: 1,
        verticalId: 1,
      });
    });
  });

  describe('list', () => {
    it('returns mapped assets for a template', async () => {
      mockedAssetDAO.list.mockResolvedValueOnce([
        {
          assetId: 1,
          assetName: 'Hero',
          description: 'desc',
          figmaURL: 'url',
          figmaId: 'figma-1',
          templateId: 5,
          verticalId: 9,
        },
      ]);

      const result = await AssetService.list(5);

      expect(mockedAssetDAO.list).toHaveBeenCalledWith({
        where: { templateId: 5 },
        order: [['assetname', 'ASC']],
      });
      expect(result).toEqual([
        {
          assetId: 1,
          assetname: 'Hero',
          description: 'desc',
          figmaURL: 'url',
          figmaId: 'figma-1',
          templateId: 5,
          verticalId: 9,
        },
      ]);
    });
  });
});
