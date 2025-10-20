import { Request } from 'express';
import { IUser } from '../interfaces/user.interface';

/**
 * Safely retrieves the authenticated user from the request.
 * Throws an error if user is missing (shouldn't happen if authMiddleware is used)
 */
export function getUser(req: Request): IUser {
  const user = (req as Request & { user?: IUser }).user;
  if (!user) {
    throw new Error('Authenticated user not found. Did you forget to use authMiddleware?');
  }
  return user;
}
