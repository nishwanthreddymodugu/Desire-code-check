import bcrypt from "bcryptjs";
import createlogger from "../config/logger";
import UserDAO from "../daos/user.dao";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/JWT";
import { IUser } from "../interfaces/user.interface";
import { User } from "../models/user";
import { CreationAttributes } from "sequelize";

const logger = createlogger(module);
class AuthService {

  // ==================== REGISTER ====================
  public register(userData: IUser): Promise<{ message: string }> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.debug(`Service: Attempting to register user: ${userData.email}`);
        const { name, email, password, mobile } = userData;

        if (!name || !email || !password) {
          return reject(new Error("Validation failed: Name, email, and password are required."));
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const dataToCreate: IUser = { 
          name, 
          email, 
          password: hashedPassword, 
          mobile: mobile 
        };
        const newUser = await UserDAO.create(dataToCreate);

        logger.info(`Service: User registered successfully: ${email}`);

        return resolve({ message: `User ${newUser.name} created successfully` });

      } catch (error: any) {
        logger.error(`Service Error in register: ${error.message}`);
        return reject(error);
      }
    });
  }

  // ==================== LOGIN ====================
  public login(loginData: { email: string; password: string }): Promise<any> {
    return new Promise(async (resolve, reject) => {
        try {
            logger.debug(`Service: Attempting to log in user: ${loginData.email}`);
            const { email, password } = loginData;

            const user = await UserDAO.findByEmail(email);
            if (!user || !(await bcrypt.compare(password, user.password))) {
              return reject(new Error("Invalid email or password"));
            }

            const accessToken = signAccessToken({ id: user.userId, name: user.name, email: user.email });
            const refreshToken = signRefreshToken({ id: user.userId });

            await UserDAO.saveRefreshToken(user.userId, refreshToken);

            logger.info(`Service: User logged in successfully: ${email}`);
            return resolve({
              message: "User authenticated",
              accessToken,
              refreshToken,
            });
        } catch (error: any) {
            logger.error(`Service Error in login: ${error.message}`);
            return reject(error);
        }
    });
  }

  // ==================== REFRESH TOKEN ====================
  public refresh(refreshData: { refreshToken: string }): Promise<{ accessToken: string, refreshToken: string }> {
    return new Promise(async (resolve, reject) => {
        try {
            logger.debug(`Service: Attempting to refresh token.`);
            const { refreshToken } = refreshData;
            if (!refreshToken) {
              return reject(new Error("Refresh token required"));
            }

            const decoded = verifyRefreshToken(refreshToken) as { id: number };
            const userId = decoded?.id;
            if (!userId) {
              return reject(new Error("Invalid refresh token payload"));
            }

            const user = await UserDAO.findById(userId);
            if (!user || user.refreshToken !== refreshToken) {
              return reject(new Error("Invalid refresh token"));
            }

            const newAccessToken = signAccessToken({ id: user.userId, name: user.name, email: user.email });
            const newRefreshToken = signRefreshToken({ id: user.userId });

            await UserDAO.saveRefreshToken(user.userId, newRefreshToken);

            logger.info(`Service: Access token refreshed for: ${user.email}`);
            return resolve({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            });
        } catch (error: any) {
            logger.error(`Service Error in refresh: ${error.message}`);
            return reject(error);
        }
    });
  }
}

export default new AuthService();
