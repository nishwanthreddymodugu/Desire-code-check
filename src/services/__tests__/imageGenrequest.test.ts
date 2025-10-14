// src/services/__tests__/imageGenRequest.service.test.ts
import ImageGenRequestService from '../imageGenRequest.service';
import ImageGenRequestDAO from '../../daos/imageGenRequest.dao';

// Do NOT import ../../db/sequelize to avoid TS2307 in this project layout.
// If the service imports it, we provide a virtual mock below.

// Mock DAO methods
jest.mock('../../daos/imageGenRequest.dao', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    updateStatus: jest.fn(),
    listByCampaign: jest.fn(),
    findByIdInCampaign: jest.fn(),
  },
}));

// IMPORTANT: Do NOT change the real SQS service implementation.
// Only mock the module boundary for tests.
jest.mock('../sqs.service', () => ({
  __esModule: true,
  default: {
    enqueueMessage: jest.fn(),
  },
}));

// Provide a virtual sequelize module only if the service references it.
// Adjust the path string to match the service's import if different.
jest.doMock('../../db/sequelize', () => {
  return {
    __esModule: true,
    sequelize: {
      transaction: jest.fn(async (cb: any) => {
        const tx = { id: 'tx-mock' };
        return cb(tx);
      }),
    },
  };
}, { virtual: true });

describe('ImageGenRequestService.generateRequest', () => {
  const dao = ImageGenRequestDAO as unknown as {
    create: jest.Mock;
    updateStatus: jest.Mock;
  };
  // Import the mocked SQS after jest.mock above
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sqsService = require('../sqs.service').default as { enqueueMessage: jest.Mock };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates request, enqueues SQS, marks pending, returns ack payload', async () => {
    // Arrange
    dao.create.mockResolvedValue({ id: 101 });
    dao.updateStatus.mockResolvedValue(undefined);
    sqsService.enqueueMessage.mockResolvedValue(undefined);

    // Act
    const result = await ImageGenRequestService.generateRequest({
      prompt: 'make an image',
      campaignId: 1,
      verticalId: 2,
      templateId: 3,
      use_ref_img: false,
      use_template_prompt: true,
      use_user_given_imgs: false,
      user_given_imgs: null,
    });

    // Assert
    expect(dao.create).toHaveBeenCalledWith({
      prompt: 'make an image',
      campaignId: 1,
      verticalId: 2,
      templateId: 3,
      use_ref_img: false,
      use_template_prompt: true,
      use_user_given_imgs: false,
      user_given_imgs: null,
    });

    expect(sqsService.enqueueMessage).toHaveBeenCalledWith(
      'desire-image-request-queue',
      { operation: 'generate_image', request_id: 101 }
    );

    // Match exactly the arguments actually used by the implementation
    expect(dao.updateStatus).toHaveBeenCalledWith(101, 'pending');

    expect(result).toEqual({ message: 'Request 101 accepted', requestId: 101 });
  });

  it('throws domain error when enqueue fails and does not mark pending', async () => {
    // Arrange
    dao.create.mockResolvedValue({ id: 202 });
    sqsService.enqueueMessage.mockRejectedValue(new Error('SQS down'));

    // Act + Assert
    await expect(
      ImageGenRequestService.generateRequest({
        prompt: 'another image',
        campaignId: 10,
        verticalId: 20,
        templateId: 30,
        use_ref_img: false,
        use_template_prompt: false,
        use_user_given_imgs: true,
        user_given_imgs: '["s3://bucket/key.jpg"]',
      })
    ).rejects.toThrow('Failed to enqueue request');

    // ensure no status bump to pending if enqueue fails
    expect(dao.updateStatus).not.toHaveBeenCalled();
  });
});
