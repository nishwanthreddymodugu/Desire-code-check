import { Router } from "express";
import verticalRoutes from './vertical.route';
import TemplateRoutes from './template.route';
import assetRoutes from './asset.route';
import campaignRoutes from './campaign.route';
const router = Router();

router.use('/verticals', verticalRoutes);
router.use('/templates', TemplateRoutes);
router.use('/assets', assetRoutes);
router.use('/campaigns', campaignRoutes);

export default router;
