import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import createLogger from "../config/logger";
const logger = createLogger(module);
import { User } from "../models/user";  // Sequelize model

// JWT secrets (from .env)
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "default_secret";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret";

// =================== REGISTER ===================
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, mobile } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      mobile,
    });

    logger.info(`User registered successfully: ${email}`);
    return res.status(201).json({ message: `User ${newUser.name} created successfully` });
  } catch (err: any) {
    logger.error("Error during registration: " + err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// =================== LOGIN ===================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = jwt.sign(
      { id: user.userId, email: user.email },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.userId, email: user.email },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "30d" } // updated to 30 days
    );
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`User logged in successfully: ${email}`);
    return res.status(200).json({
      message: "User authenticated",
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    logger.error("Error during login: " + err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// =================== REFRESH TOKEN ===================
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (err: any, decoded: any) => {
      if (err) {
        logger.error("Invalid refresh token");
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const user = await User.findOne({ where: { refreshToken } });
      if (!user) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const newAccessToken = jwt.sign(
        { id: user.userId, email: user.email },
        ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      const newRefreshToken = jwt.sign(
        { id: user.userId, email: user.email },
        REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" } // updated to 30 days
      );

      user.refreshToken = newRefreshToken;
      await user.save();

      logger.info(`Access token refreshed for: ${user.email}`);
      return res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    });
  } catch (err: any) {
    logger.error("Error during token refresh: " + err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
