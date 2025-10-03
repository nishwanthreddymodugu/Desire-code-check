// import jwt, { SignOptions } from 'jsonwebtoken';
// import dotenv from 'dotenv';
// dotenv.config();

// const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'default_secret';
// const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
// const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
// const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

// export const signAccessToken = (payload: object) => {
//   return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as SignOptions);
// };

// export const signRefreshToken = (payload: object) => {
//   return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as SignOptions);
// };

// export const verifyAccessToken = (token: string) => jwt.verify(token, ACCESS_TOKEN_SECRET);
// export const verifyRefreshToken = (token: string) => jwt.verify(token, REFRESH_TOKEN_SECRET);

import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'default_secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export const signAccessToken = (payload: object) => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as SignOptions);
};

export const signRefreshToken = (payload: object) => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as SignOptions);
};

export const verifyAccessToken = (token: string) => jwt.verify(token, ACCESS_TOKEN_SECRET);
export const verifyRefreshToken = (token: string) => jwt.verify(token, REFRESH_TOKEN_SECRET);