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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Tests for the 'register' method ---
  describe('register', () => {
    it('should create a new user and return success message', async () => {
      // 1. ARRANGE
      const userData = { name: 'New User', email: 'new@example.com', password: 'Password123!' };
      // @ts-expect-error: Type mismatch due to bcrypt mock typing
      mockedBcrypt.hash.mockResolvedValue('hashed_password');
      mockedUserDAO.create.mockResolvedValue({ name: 'New User' } as User);

      // 2. ACT
      const result = await AuthService.register(userData);

      // 3. ASSERT
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('Password123!', 10);
      expect(mockedUserDAO.create).toHaveBeenCalledWith({
        name: 'New User',
        email: 'new@example.com',
        password: 'hashed_password',
        mobile: undefined
      });
      expect(result).toEqual({ message: 'User New User created successfully' });
    });

    it('should throw error for missing required fields', async () => {
      // ARRANGE
      const userData = { name: '', email: '', password: '' };

      // ACT & ASSERT
      await expect(AuthService.register(userData)).rejects.toThrow('Validation failed: Name, email, and password are required.');
    });

    it('should throw error for missing name', async () => {
      // ARRANGE
      const userData = { name: '', email: 'test@example.com', password: 'Password123!' };

      // ACT & ASSERT
      await expect(AuthService.register(userData)).rejects.toThrow('Validation failed: Name, email, and password are required.');
    });

    it('should throw error for missing email', async () => {
      // ARRANGE
      const userData = { name: 'Test User', email: '', password: 'Password123!' };

      // ACT & ASSERT
      await expect(AuthService.register(userData)).rejects.toThrow('Validation failed: Name, email, and password are required.');
    });

    it('should throw error for missing password', async () => {
      // ARRANGE
      const userData = { name: 'Test User', email: 'test@example.com', password: '' };

      // ACT & ASSERT
      await expect(AuthService.register(userData)).rejects.toThrow('Validation failed: Name, email, and password are required.');
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
      const loginData = { email: 'test@example.com', password: 'password123' };

      mockedUserDAO.findByEmail.mockResolvedValue(mockUser);
      // @ts-expect-error: Type mismatch due to bcrypt mock typing
      mockedBcrypt.compare.mockResolvedValue(Promise.resolve(true)); // Simulate correct password
      mockedSignAccessToken.mockReturnValue('new-access-token');
      mockedSignRefreshToken.mockReturnValue('new-refresh-token');

      // ACT
      const result = await AuthService.login(loginData);

      // ASSERT
      expect(mockedUserDAO.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(mockedSignAccessToken).toHaveBeenCalledWith({ id: 1, email: 'test@example.com' });
      expect(mockedSignRefreshToken).toHaveBeenCalledWith({ id: 1 });
      expect(mockedUserDAO.saveRefreshToken).toHaveBeenCalledWith(1, 'new-refresh-token');
      expect(result).toEqual({
        message: 'User authenticated',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw error for non-existent user', async () => {
      // ARRANGE
      const loginData = { email: 'nonexistent@example.com', password: 'password123' };
      mockedUserDAO.findByEmail.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for incorrect password', async () => {
      // ARRANGE
      const mockUser = { userId: 1, password: 'hashed_password' } as User;
      const loginData = { email: 'test@example.com', password: 'wrongpassword' };

      mockedUserDAO.findByEmail.mockResolvedValue(mockUser);
      // @ts-expect-error: Type mismatch due to bcrypt mock typing
      mockedBcrypt.compare.mockResolvedValue(Promise.resolve(false)); // Simulate incorrect password

      // ACT & ASSERT
      await expect(AuthService.login(loginData)).rejects.toThrow('Invalid email or password');
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
      const refreshData = { refreshToken: 'valid-refresh-token' };

      mockedVerifyRefreshToken.mockReturnValue({ id: 1 }); // Simulate valid token
      mockedUserDAO.findById.mockResolvedValue(mockUser);
      mockedSignAccessToken.mockReturnValue('new-access-token-from-refresh');
      mockedSignRefreshToken.mockReturnValue('new-refresh-token-from-refresh');

      // ACT
      const result = await AuthService.refresh(refreshData);

      // ASSERT
      expect(mockedVerifyRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockedUserDAO.findById).toHaveBeenCalledWith(1);
      expect(mockedSignAccessToken).toHaveBeenCalledWith({ id: 1, email: 'test@example.com' });
      expect(mockedSignRefreshToken).toHaveBeenCalledWith({ id: 1 });
      expect(mockedUserDAO.saveRefreshToken).toHaveBeenCalledWith(1, 'new-refresh-token-from-refresh');
      expect(result).toEqual({
        accessToken: 'new-access-token-from-refresh',
        refreshToken: 'new-refresh-token-from-refresh',
      });
    });

    it('should throw error for missing refresh token', async () => {
      // ARRANGE
      const refreshData = { refreshToken: '' };

      // ACT & ASSERT
      await expect(AuthService.refresh(refreshData)).rejects.toThrow('Refresh token required');
    });

    it('should throw error for invalid refresh token payload', async () => {
      // ARRANGE
      const refreshData = { refreshToken: 'invalid-token' };
      mockedVerifyRefreshToken.mockReturnValue(null);

      // ACT & ASSERT
      await expect(AuthService.refresh(refreshData)).rejects.toThrow('Invalid refresh token payload');
    });

    it('should throw error for non-existent user', async () => {
      // ARRANGE
      const refreshData = { refreshToken: 'valid-refresh-token' };
      mockedVerifyRefreshToken.mockReturnValue({ id: 999 });
      mockedUserDAO.findById.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(AuthService.refresh(refreshData)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error if stored refresh token does not match', async () => {
      // ARRANGE
      const mockUser = {
        userId: 1,
        email: 'test@example.com',
        refreshToken: 'a-different-token-stored-in-db' // Simulate token mismatch
      } as User;
      const refreshData = { refreshToken: 'valid-refresh-token' };

      mockedVerifyRefreshToken.mockReturnValue({ id: 1 });
      mockedUserDAO.findById.mockResolvedValue(mockUser);

      // ACT & ASSERT
      await expect(AuthService.refresh(refreshData)).rejects.toThrow('Invalid refresh token');
    });
  });
});
