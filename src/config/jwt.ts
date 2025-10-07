import * as dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("CRITICAL ERROR: JWT_SECRET is not defined in the .env file.");
}

export const jwtConfig = {
    secret: JWT_SECRET,
};