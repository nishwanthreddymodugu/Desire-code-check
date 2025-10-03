import { Router, Request, Response, NextFunction } from "express";
import AuthService from "../services/auth.service"; // import class instance
import createlogger from "../config/logger";
const logger = createlogger(module);  

const authRouter = Router();

// Register
authRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`POST /auth/register called with data: ${JSON.stringify(req.body)}`);
  try {
    await AuthService.register(req, res); // call method on instance
  } catch (error: any) {
    logger.error(`Error in POST /auth/register: ${error.message}`);
    next(error);
  }
});

// Login
authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`POST /auth/login called with data: ${JSON.stringify(req.body)}`);
  try {
    await AuthService.login(req, res);
  } catch (error: any) {
    logger.error(`Error in POST /auth/login: ${error.message}`);
    next(error);
  }
});

// Refresh Token
authRouter.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  logger.info("POST /auth/refresh called");
  try {
    await AuthService.refresh(req, res);
  } catch (error: any) {
    logger.error(`Error in POST /auth/refresh: ${error.message}`);
    next(error);
  }
});

export default authRouter;
