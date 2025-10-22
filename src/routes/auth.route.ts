import { Router, Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import { IUser } from '../interfaces/user.interface';
import createlogger from '../config/logger';
import validator from 'validator'; 
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
const logger = createlogger(module);
const router = Router();

// ==================== REGISTER ====================
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Route: POST /auth/register called`);
  const { name, email, password, mobile } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }
  if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format provided.' });
  }
  if (mobile && !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'Invalid mobile number format. Expected 10 digits only.' });
  }
  // ----------------------------------------------------

  try {
    const userIn: IUser = { name, email, password, mobile };
    const userOut = await AuthService.register(userIn);
    
    res.status(201).json(userOut);

  } catch (error: any) {
    logger.error(`Route Error in /register: ${error.name} - ${error.message}`);
    let status = 500;
    let message = 'An internal server error occurred.';

    if (error.name === 'SequelizeUniqueConstraintError') {
        status = 409; 
        const field = error.errors[0]?.path;
        if (field === 'email' || field === 'mobile') {
            message = `An account with this ${field} already exists.`;
        } else {
            message = 'A unique constraint was violated. Please check your inputs.';
        }
    } else if (error.name === 'ValidationError') {
        status = 400;
        message = error.message;
    }
    res.status(status).json({ message });
  }
});

// ==================== LOGIN ====================
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Route: POST /auth/login called for email: ${req.body.email}`);

const { email, password } = req.body;
  if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const result = await AuthService.login({ email, password });
    res.status(200).json(result);
  } 
  catch (error: any) {
    logger.error(`Route Error in /login: ${error.message}`);
    res.status(401).json({ message: error.message });
  }
});

router.get('/me',authMiddleware, async (req: Request, res: Response) => {
  logger.info("Route: GET /auth/me called");

    const user = (req as Request & { user: IUser }).user;

    if (!user) {
      return res.status(401).json({ message: 'User payload not found after authentication.' });
    }
    res.status(200).json({
      username: user.name,
      email: user.email,
    });
  } 
);
// ==================== REFRESH TOKEN ====================
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Route: POST /auth/refresh called");

    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required.' });
    }
  try {
    const result = await AuthService.refresh({ refreshToken });
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Route Error in /refresh: ${error.message}`);
    res.status(401).json({ message: error.message });
  }
});

export default router;