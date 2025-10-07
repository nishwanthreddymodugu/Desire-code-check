import { Router } from "express";
import verticalRoutes from './vertical.route';
import TemplateRoutes from './template.route';
import assetRoutes from './asset.route';
import campaignRoutes from './campaign.route';
import searchRoutes from './search.route';
import { authMiddleware } from '../middlewares/auth.middleware';
import authRouter from "./auth.route";
const router = Router();

router.use('/verticals', authMiddleware, verticalRoutes);
router.use('/templates', authMiddleware, TemplateRoutes);
router.use('/assets', authMiddleware, assetRoutes);
router.use('/campaigns', authMiddleware,campaignRoutes);
router.use('/search', authMiddleware, searchRoutes);
router.use('/auth', authRouter);

export default router;