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

jest.mock('@aws-sdk/client-sqs', () => {
  class BaseCommand<TInput> {
    public readonly input: TInput;

    constructor(input: TInput) {
      this.input = input;
    }
  }

  class MockSQSClient {
    constructor(config: unknown) {
      clientConstructorMock(config);
    }

    public send = sendMock;
  }

  return {
    __esModule: true,
    SQSClient: MockSQSClient,
    GetQueueUrlCommand: class<TInput> extends BaseCommand<TInput> {},
    SendMessageCommand: class<TInput> extends BaseCommand<TInput> {},
  };
});

type SQSServiceModule = typeof import('../sqs.service');

describe('SQSService', () => {
  let sqsService: SQSServiceModule['default'];

  beforeEach(async () => {
    jest.resetModules();
    sendMock.mockReset();
    clientConstructorMock.mockReset();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();

    process.env.AWS_REGION = 'us-east-1';
    delete process.env.AWS_SQS_ENDPOINT;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
    delete process.env.AWS_ACCOUNT_ID;

    sqsService = (await import('../sqs.service')).default;
  });

  it('throws when queue name is missing', async () => {
    await expect(sqsService.enqueueMessage('', { foo: 'bar' })).rejects.toThrow(
      'Queue name is required to enqueue a message.'
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('throws when payload is missing', async () => {
    await expect(sqsService.enqueueMessage('queue', undefined as unknown)).rejects.toThrow(
      'Payload is required to enqueue a message.'
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('fetches the queue url and enqueues the message', async () => {
    sendMock
      .mockResolvedValueOnce({ QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue' })
      .mockResolvedValueOnce({ MessageId: 'abc-123' });

    const messageId = await sqsService.enqueueMessage('queue', { hello: 'world' });

    expect(messageId).toBe('abc-123');

    expect(sendMock).toHaveBeenCalledTimes(2);
    const [getQueueUrlCall, sendMessageCall] = sendMock.mock.calls;

    expect(getQueueUrlCall[0].input).toMatchObject({ QueueName: 'queue' });
    expect(sendMessageCall[0].input).toMatchObject({
      QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue',
      MessageBody: JSON.stringify({ hello: 'world' }),
    });
  });

  it('caches queue url across multiple messages', async () => {
    sendMock
      .mockResolvedValueOnce({ QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123/queue' })
      .mockResolvedValueOnce({ MessageId: 'first' })
      .mockResolvedValueOnce({ MessageId: 'second' });

    await sqsService.enqueueMessage('queue', 'first-message');
    await sqsService.enqueueMessage('queue', 'second-message');

    expect(sendMock).toHaveBeenCalledTimes(3);

    const queueLookups = sendMock.mock.calls.filter(call => 'QueueName' in call[0].input);
    expect(queueLookups).toHaveLength(1);

    const messageCalls = sendMock.mock.calls.filter(call => 'MessageBody' in call[0].input);
    expect(messageCalls).toHaveLength(2);
    expect(messageCalls[0][0].input.MessageBody).toBe('first-message');
    expect(messageCalls[1][0].input.MessageBody).toBe('second-message');
  });
});

