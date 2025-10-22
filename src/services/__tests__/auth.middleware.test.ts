import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { jwtConfig } from '../../config/jwt';
import { IUser } from '../../interfaces/user.interface';

process.env.PICASSO_TOKEN = 'test-token';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = { headers: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should return 401 if x-auth header is missing', () => {
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Authentication token is missing')
    }));
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if JWT is invalid', () => {
    mockRequest.headers = { 'x-auth': 'bad-token' };
    mockedJwt.verify.mockImplementation((_token, _secret, callback) => {
      (callback as jwt.VerifyCallback)(new jwt.JsonWebTokenError('invalid token'), undefined);
    });

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/invalid/i) })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() if token is valid', () => {
    mockRequest.headers = { 'x-auth': 'valid-token' };
    const mockUserPayload = { userId: 1, name: 'Satyam', email: 'satyam@example.com' };

    mockedJwt.verify.mockImplementation((_token, _secret, callback) => {
      (callback as jwt.VerifyCallback)(null, mockUserPayload);
    });

    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect((mockRequest as Request & { user?: IUser }).user).toEqual(mockUserPayload);
  });
});
