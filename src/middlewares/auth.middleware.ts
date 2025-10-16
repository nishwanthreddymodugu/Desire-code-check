import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import createLogger from '../config/logger';
import { IUser } from '../interfaces/user.interface';

const logger = createLogger(module);

export function authMiddleware(req: Request, res: Response, next: NextFunction) {

  console.log('--- RECEIVED HEADERS ---');
  console.log(req.headers);
  console.log('------------------------');
  const token = req.headers['x-auth'] as string;
  
  const picassoToken = req.headers['x-picasso-auth'] as string;
  console.log(`Received Picasso Token: ${picassoToken}`);
  console.log(`Expected Picasso Token: ${process.env.PICASSO_TOKEN}`);
if (picassoToken) {
  if(picassoToken === process.env.PICASSO_TOKEN){
    logger.info('Authentication successful: Internal service call detected (Picasso).');
    console.log('Picasso token matched. Bypassing standard authentication.----', picassoToken); 
    
    const payload = { id: 0, name: 'Picasso', email:"", password: "" };
    (req as Request & { user?: IUser }).user = payload;
    return next();
  }
}
console.log('token:', token);

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
    
    (req as Request & { user?: IUser }).user = payload as IUser;
    next();
  });
}