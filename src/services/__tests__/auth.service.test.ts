import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import AuthService from '../auth.service';
import UserDAO from '../../daos/user.dao';
import { User } from '../../models/user';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/JWT';

// --- Mock Setup ---
// We mock all the external dependencies the service relies on.
jest.mock('bcryptjs');
jest.mock('../../daos/user.dao');
// This tells Jest to use our new mock file from src/utils/__mocks__/JWT.ts
jest.mock('../../utils/JWT');

// Create typed mock instances for easy use in our tests.
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedUserDAO = UserDAO as jest.Mocked<typeof UserDAO>;
const mockedSignAccessToken = signAccessToken as jest.Mock;
const mockedSignRefreshToken = signRefreshToken as jest.Mock;
const mockedVerifyRefreshToken = verifyRefreshToken as jest.Mock;


describe('AuthService', () => {

  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = { body: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // --- Tests for the 'register' method ---
  describe('register', () => {
    it('should create a new user and return a 201 status', async () => {
      // 1. ARRANGE
      mockRequest.body = { name: 'New User', email: 'new@example.com', password: 'Password123!' };
      mockedUserDAO.findByEmail.mockResolvedValue(null); // No existing user
      // @ts-expect-error: Type mismatch due to bcrypt mock typing
      mockedBcrypt.hash.mockResolvedValue('hashed_password');
      mockedUserDAO.create.mockResolvedValue({ name: 'New User' } as User);

      // 2. ACT
      await AuthService.register(mockRequest as Request, mockResponse as Response);

      // 3. ASSERT
      expect(mockedUserDAO.create).toHaveBeenCalledWith({
        name: 'New User',
        email: 'new@example.com',
        password: 'hashed_password',
        mobile: undefined
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User New User created successfully' });
    });

    it('should return a 409 error if the user already exists', async () => {
      // ARRANGE
      mockRequest.body = { name: 'Existing User', email: 'existing@example.com', password: 'Password123!' };
      mockedUserDAO.findByEmail.mockResolvedValue({ userId: 123 } as User); // Simulate user found

      // ACT
      await AuthService.register(mockRequest as Request, mockResponse as Response);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User already exists' });
    });
  });

  // --- Tests for the 'login' method ---
  describe('login', () => {
    it('should return tokens for a successful login', async () => {
      // ARRANGE
      const mockUser = {
        userId: 1,
        email: 'test@example.com',
        password: 'hashed_password'
      } as User;
      mockRequest.body = { email: 'test@example.com', password: 'password123' };

      mockedUserDAO.findByEmail.mockResolvedValue(mockUser);
      // @ts-expect-error: Type mismatch due to bcrypt mock typing
      mockedBcrypt.compare.mockResolvedValue(Promise.resolve(true)); // Simulate correct password
      mockedSignAccessToken.mockReturnValue('new-access-token');
      mockedSignRefreshToken.mockReturnValue('new-refresh-token');

      // ACT
      await AuthService.login(mockRequest as Request, mockResponse as Response);

      // ASSERT
      expect(mockedUserDAO.saveRefreshToken).toHaveBeenCalledWith(1, 'new-refresh-token');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'User authenticated',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should return a 401 error for an incorrect password', async () => {
      // ARRANGE
      const mockUser = { userId: 1, password: 'hashed_password' } as User;
      mockRequest.body = { email: 'test@example.com', password: 'wrongpassword' };

      mockedUserDAO.findByEmail.mockResolvedValue(mockUser);
      // @ts-expect-error: Type mismatch due to bcrypt mock typing
      mockedBcrypt.compare.mockResolvedValue(Promise.resolve(false)); // Simulate incorrect password

      // ACT
      await AuthService.login(mockRequest as Request, mockResponse as Response);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });
  });

  // --- Tests for the 'refresh' method ---
  describe('refresh', () => {
    it('should return new tokens for a valid refresh token', async () => {
      // ARRANGE
      const mockUser = {
        userId: 1,
        email: 'test@example.com',
        refreshToken: 'valid-refresh-token'
      } as User;
      mockRequest.body = { refreshToken: 'valid-refresh-token' };

      mockedVerifyRefreshToken.mockReturnValue({ id: 1 }); // Simulate valid token
      mockedUserDAO.findById.mockResolvedValue(mockUser);
      mockedSignAccessToken.mockReturnValue('new-access-token-from-refresh');
      mockedSignRefreshToken.mockReturnValue('new-refresh-token-from-refresh');

      // ACT
      await AuthService.refresh(mockRequest as Request, mockResponse as Response);

      // ASSERT
      expect(mockedUserDAO.findById).toHaveBeenCalledWith(1);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: 'new-access-token-from-refresh',
        refreshToken: 'new-refresh-token-from-refresh',
      });
    });

    it('should return a 403 error if the stored refresh token does not match', async () => {
      // ARRANGE
      const mockUser = {
        userId: 1,
        email: 'test@example.com',
        refreshToken: 'a-different-token-stored-in-db' // Simulate token mismatch
      } as User;
      mockRequest.body = { refreshToken: 'valid-refresh-token' };

      mockedVerifyRefreshToken.mockReturnValue({ id: 1 });
      mockedUserDAO.findById.mockResolvedValue(mockUser);

      // ACT
      await AuthService.refresh(mockRequest as Request, mockResponse as Response);

      // ASSERT
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid refresh token' });
    });
  });
});
