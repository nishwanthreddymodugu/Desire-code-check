import VerticalService from '../vertical.service';
import VerticalDAO from '../../daos/vertical.dao';

jest.mock('../../daos/vertical.dao', () => ({
  __esModule: true,
  default: {
    save: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
  },
}));

const mockedVerticalDAO = VerticalDAO as unknown as {
  save: jest.Mock;
  list: jest.Mock;
  findById: jest.Mock;
};

describe('VerticalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('throws when verticalname is missing', async () => {
      await expect(VerticalService.save({ verticalId: 1 } as any)).rejects.toThrow(
        'Validation failed: verticalname is required.'
      );
    });

    it('throws when a duplicate verticalname exists', async () => {
      mockedVerticalDAO.list.mockResolvedValueOnce([
        { verticalId: 2, verticalName: 'Sales' },
      ]);

      await expect(
        VerticalService.save({ verticalId: 1, verticalname: 'Sales' })
      ).rejects.toThrow('verticalname already exists, please use another name.');

      expect(mockedVerticalDAO.save).not.toHaveBeenCalled();
    });

    it('persists a new vertical when validation passes', async () => {
      mockedVerticalDAO.list.mockResolvedValueOnce([
        { verticalId: 2, verticalName: 'Marketing' },
      ]);
      mockedVerticalDAO.save.mockResolvedValueOnce({
        verticalId: 1,
        verticalName: 'Sales',
      });

      const result = await VerticalService.save({ verticalname: 'Sales' });

      expect(mockedVerticalDAO.save).toHaveBeenCalledWith({
        verticalId: undefined,
        verticalName: 'Sales',
      });
      expect(result).toEqual({ verticalId: 1, verticalname: 'Sales' });
    });
  });

  describe('list', () => {
    it('throws when there are no verticals', async () => {
      mockedVerticalDAO.list.mockResolvedValueOnce([]);

      await expect(VerticalService.list()).rejects.toThrow('No verticals found.');
    });

    it('returns the mapped list of verticals', async () => {
      mockedVerticalDAO.list.mockResolvedValueOnce([
        { verticalId: 1, verticalName: 'Sales' },
        { verticalId: 2, verticalName: 'Marketing' },
      ]);

      const result = await VerticalService.list();

      expect(result).toEqual([
        { verticalId: 1, verticalname: 'Sales' },
        { verticalId: 2, verticalname: 'Marketing' },
      ]);
    });
  });
});
