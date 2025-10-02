import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import logger from '../config/logger';
import UserDAO from '../daos/user.dao';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/JWT';
import { IUser } from '../interfaces/user.interface';

class AuthService {
  public async register(req: Request, res: Response) {
    try {
      const { name, email, password, mobile } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      const existingUser = await UserDAO.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await UserDAO.create({ name, email, password: hashedPassword, mobile });

      logger.info(`User registered successfully: ${email}`);
      return res.status(201).json({ message: `User ${newUser.name} created successfully` });
    } catch (err: any) {
      logger.error('Error during registration: ' + err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const user = await UserDAO.findByEmail(email);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const accessToken = signAccessToken({ id: user.id, email: user.email });
      const refreshToken = signRefreshToken({ id: user.id });

      await UserDAO.saveRefreshToken(user.id, refreshToken);

      logger.info(`User logged in successfully: ${email}`);
      return res.status(200).json({ message: 'User authenticated', accessToken, refreshToken });
    } catch (err: any) {
      logger.error('Error during login: ' + err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  public async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token required' });
      }

      let decoded: any;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (err) {
        logger.error('Invalid refresh token');
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const user = await UserDAO.findByRefreshToken(refreshToken);
      if (!user) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const newAccessToken = signAccessToken({ id: user.id, email: user.email });
      const newRefreshToken = signRefreshToken({ id: user.id });

      await UserDAO.saveRefreshToken(user.id, newRefreshToken);

      logger.info(`Access token refreshed for: ${user.email}`);
      return res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err: any) {
      logger.error('Error during token refresh: ' + err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new AuthService();
