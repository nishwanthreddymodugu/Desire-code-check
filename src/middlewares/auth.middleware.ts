import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import createLogger from '../config/logger';

const logger = createLogger(module);

export interface AuthRequest extends Request {
  user?: { userId?: number; name: string; email: string; password: string; mobile: string;};
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers['x-auth'] as string;

  if (!token) {
    logger.warn('Authentication failed: Missing x-auth header.');
    return res.status(401).json({ 
      error: "Unauthorized",
      message: 'Authentication token is missing. Please include it in the \'x-auth\' header.' 
    });
  }

  jwt.verify(token, jwtConfig.secret, (err: jwt.VerifyErrors | null, payload: any) => {
    if (err) {
      logger.error(`Authentication failed: Invalid token provided. Reason: ${err.message}`);
      return res.status(401).json({ 
        error: "Unauthorized",
        message: 'The provided authentication token is invalid or has expired.' 
      });
    }
    
    req.user = payload as { userId?: number; name: string; email: string; password: string; mobile: string;};
    next();
  });
}