import { Readable } from 'stream';

const sendMock = jest.fn();
const clientConstructorMock = jest.fn();

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../config/logger', () => ({
  __esModule: true,
  default: () => mockLogger,
}));

jest.mock('@aws-sdk/client-s3', () => {
  class BaseCommand<TInput> {
    public readonly input: TInput;

    constructor(input: TInput) {
      this.input = input;
    }
  }

  class MockS3Client {
    constructor(config: unknown) {
      clientConstructorMock(config);
    }

    public send = sendMock;
  }

  return {
    __esModule: true,
    S3Client: MockS3Client,
    ListObjectsV2Command: class<TInput> extends BaseCommand<TInput> {},
    PutObjectCommand: class<TInput> extends BaseCommand<TInput> {},
    GetObjectCommand: class<TInput> extends BaseCommand<TInput> {},
  };
});

type S3ServiceModule = typeof import('../s3.service');

describe('S3Service', () => {
  let s3Service: S3ServiceModule['default'];

  beforeEach(async () => {
    jest.resetModules();
    sendMock.mockReset();
    clientConstructorMock.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();

    process.env.AWS_REGION = 'us-east-1';
    delete process.env.AWS_S3_ENDPOINT;
    delete process.env.AWS_S3_FORCE_PATH_STYLE;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;

    s3Service = (await import('../s3.service')).default;
  });

  it('throws when listing without a bucket name', async () => {
    await expect(s3Service.listObjects('', 'prefix')).rejects.toThrow(
      'Bucket name is required to list objects.'
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('lists all object keys across paginated responses', async () => {
    sendMock
      .mockResolvedValueOnce({
        Contents: [{ Key: 'one' }, { Key: 'two' }],
        IsTruncated: true,
        NextContinuationToken: 'token-1',
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: 'three' }],
        IsTruncated: false,
      });

    const keys = await s3Service.listObjects('bucket', 'my-prefix/');

    expect(keys).toEqual(['one', 'two', 'three']);
    expect(sendMock).toHaveBeenCalledTimes(2);

    const firstCall = sendMock.mock.calls[0][0] as { input: Record<string, unknown> };
    const secondCall = sendMock.mock.calls[1][0] as { input: Record<string, unknown> };

    expect(firstCall.input).toMatchObject({ Bucket: 'bucket', Prefix: 'my-prefix/' });
    expect(secondCall.input).toMatchObject({ ContinuationToken: 'token-1' });
  });

  it('uploads an object with the provided payload', async () => {
    sendMock.mockResolvedValueOnce({});

    await s3Service.putObject('bucket', 'images/photo.jpg', 'payload', 'image/jpeg');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Bucket: 'bucket',
      Key: 'images/photo.jpg',
      Body: 'payload',
      ContentType: 'image/jpeg',
    });
  });

  it('returns objects and metadata when fetching by prefix', async () => {
    const payload = Buffer.from('image-bytes');

    sendMock
      .mockResolvedValueOnce({
        Contents: [{ Key: 'images/photo.jpg' }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({
        Body: Readable.from([payload]),
        ContentType: 'image/jpeg',
        Metadata: { foo: 'bar' },
      });

    const objects = await s3Service.getObjectsByPrefix('bucket', 'images/');

    expect(objects).toHaveLength(1);
    const [object] = objects;

    expect(object.key).toBe('images/photo.jpg');
    expect(object.body.equals(payload)).toBe(true);
    expect(object.contentType).toBe('image/jpeg');
    expect(object.metadata).toEqual({ foo: 'bar' });

    expect(sendMock).toHaveBeenCalledTimes(2);
    const [, getObjectCall] = sendMock.mock.calls;
    const getCommand = getObjectCall[0] as { input: Record<string, unknown> };
    expect(getCommand.input).toMatchObject({
      Bucket: 'bucket',
      Key: 'images/photo.jpg',
    });
  });
});
