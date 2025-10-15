import { Router, Request, Response, NextFunction } from 'express';
import AuthService from '../services/auth.service';
import { IUser } from '../interfaces/user.interface';
import createlogger from '../config/logger';
import validator from 'validator'; 
import { authMiddleware } from '../middlewares/auth.middleware';
const logger = createlogger(module);
const router = Router();
// ==================== REGISTER ====================
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Route: POST /auth/register called`);
  try {
    const { name, email, password, mobile } = req.body;

    // --- The route handler is responsible for all format validation ---
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format provided.' });
    }
    if (mobile && !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: 'Invalid mobile number format. Expected format: 10 digits only' });
    }
    
    const userIn: IUser = { name, email, password, mobile };
    const userOut = await AuthService.register(userIn);
    
    res.status(201).json(userOut);

  } catch (error: any) {
    logger.error(`Route Error in /register: ${error.name} - ${error.message}`);
    let status = 500;
    let message = 'An internal server error occurred.';

    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
        status = 409;
        const field = error.errors[0]?.path || 'field';
        if (field === 'email') {
            message = 'An account with this email already exists.';
        } else if (field === 'mobile') {
            message = 'An account with this mobile number already exists.';
        } else {
            message = `An account with this ${field} already exists.`;
        }
    }
    // Handle Sequelize validation errors
    else if (error.name === 'SequelizeValidationError') {
        status = 400;
        message = error.errors[0]?.message || 'Validation error occurred.';
    }
    // Handle general validation errors from service
    else if (error.message.includes('Validation failed')) {
        status = 400;
        message = error.message;
    }

    res.status(status).json({ message });
  }
});

// ==================== LOGIN ====================
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Route: POST /auth/login called for email: ${req.body.email}`);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    const result = await AuthService.login({ email, password });
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Route Error in /login: ${error.message}`);
    res.status(401).json({ message: error.message });
  }
});

router.get('/me',authMiddleware, async (req: Request, res: Response) => {
  logger.info("Route: GET /auth/me called");
  try {
    // The authMiddleware has already validated the token and attached the user payload
    const user = (req as Request & { user: IUser }).user;

    if (!user) {
      // This is a safeguard, middleware should prevent this
      return res.status(401).json({ message: 'User payload not found after authentication.' });
    }

    // Return the required fields
    res.status(200).json({
      username: user.name,
      email: user.email,
    });

  } catch (error: any) {
    logger.error(`Route Error in /me: ${error.message}`);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

// ==================== REFRESH TOKEN ====================
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Route: POST /auth/refresh called");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required.' });
    }
    const result = await AuthService.refresh({ refreshToken });
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(`Route Error in /refresh: ${error.message}`);
    res.status(401).json({ message: error.message });
  }
});

export default router;