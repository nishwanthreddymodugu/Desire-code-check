import { Router, Request, Response, NextFunction } from "express";
import verticalRoutes from './vertical.route';
import TemplateRoutes from './template.route';
import assetRoutes from './asset.route';
import campaignRoutes from './campagin.route';
import authRoutes from './auth.route';
import logger from "../config/logger"; // Winston logger

const router = Router();

// Global middleware to log every request once
router.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Register all routes
router.use('/verticals', verticalRoutes);
router.use('/templates', TemplateRoutes);
router.use('/assets', assetRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/auth', authRoutes);

export default router;