import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { JwtPayload } from '../interfaces/user.interface';
import createLogger from '../config/logger';
const logger = createLogger(module);
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  
  const picassoToken = req.headers['x-picasso-auth'] as string;

  if (picassoToken) {
    if (picassoToken === process.env.PICASSO_TOKEN) {
      logger.info('Authentication successful: Internal service call detected.');
      
      const systemUser: JwtPayload = { userId: 0, name: 'System-Picasso', email: 'system@internal' };
      req.user = systemUser;
      return next();
    } else {
      logger.error('Authentication failed: Invalid x-picasso-auth token provided.');
      return res.status(401).json({ 
        error: "Unauthorized",
        message: 'Invalid internal service token.' 
      });
    }
  }
  
  const token = req.headers['x-auth'] as string;
  if (!token) {

    logger.error('Authentication failed: Missing x-auth header.');
    return res.status(401).json({ 
      error: "Unauthorized",
      message: 'Authentication token is missing. Please include it in the \'x-auth\' header.' 
    });
  }
  jwt.verify(token, jwtConfig.secret, (err, payload) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        logger.error(`Authentication failed: Token has expired.`);
        return res.status(401).json({ 
          error: "Unauthorized",
          message: 'Your session has expired. Please log in again.' 
        });
      } else {
        logger.error(`Authentication failed: Invalid token. Reason: ${err.message}`);
        return res.status(401).json({ 
          error: "Unauthorized",
          message: 'The provided authentication token is invalid.' 
        });
      }
    }
    
    req.user = payload as JwtPayload;
    next();
  });
}