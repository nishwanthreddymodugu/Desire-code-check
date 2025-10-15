// src/middleware/__tests__/auth.middleware.test.ts

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { jwtConfig } from '../../config/jwt.js';
import { IUser } from '../../interfaces/user.interface.js';

// Mock the 'jsonwebtoken' library so we can control its behavior during tests.
jest.mock('jsonwebtoken');
// Create a typed version of the mock for better autocompletion.
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('authMiddleware', () => {

  // We'll use these mock variables in each test.
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  // This hook runs before each test, resetting our mock objects to a clean state.
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(), // Allows chaining .status().json()
      json: jest.fn(),
    };
    nextFunction = jest.fn(); // A mock function to track if 'next' is called.
  });

  it('should return a 401 error if the x-auth header is missing', () => {
    // 1. ARRANGE: No headers are provided in the mockRequest.

    // 2. ACT: Call the middleware with our mock objects.
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
    
    // 3. ASSERT: Check that the correct error response was sent.
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Authentication token is missing')
    }));
    // Crucially, assert that 'next()' was NOT called, meaning the request was stopped.
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return a 401 error if the JWT is invalid or expired', () => {
    // ARRANGE: Provide a fake token in the header.
    mockRequest.headers = { 'x-auth': 'an-invalid-token' };
    
    // Tell our mock jwt.verify function to simulate a failure.
    mockedJwt.verify.mockImplementation((token, secret, callback) => {
      // The callback is called with an error, just like the real library would do.
      (callback as jwt.VerifyCallback)(new jwt.JsonWebTokenError('invalid token'), undefined);
    });

    // ACT
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // ASSERT
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('invalid or has expired')
    }));
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next() and attach the user payload if the token is valid', () => {
    // ARRANGE
    mockRequest.headers = { 'x-auth': 'a-valid-token' };
    const mockUserPayload = { userId: 123, name: 'Satyam', email: 'satyam@example.com' };

    // Tell our mock jwt.verify to simulate a success.
    mockedJwt.verify.mockImplementation((token, secret, callback) => {
      // The callback is called with no error and with the user payload.
      (callback as jwt.VerifyCallback)(null, mockUserPayload);
    });

    // ACT
    authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    // ASSERT
    // Check that 'next()' was called exactly once, allowing the request to proceed.
    expect(nextFunction).toHaveBeenCalledTimes(1);
    // Check that no error status was sent.
    expect(mockResponse.status).not.toHaveBeenCalled();
    // Check that the user payload was correctly attached to the request object.
    expect((mockRequest as Request & { user?: IUser }).user).toEqual(mockUserPayload);
  });
});