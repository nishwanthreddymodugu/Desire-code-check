import { Router } from "express";
import verticalRoutes from './vertical.route';
import TemplateRotes from './template.route';
import assetRoutes from './asset.route';
import campaignRoutes from './campagin.route';
const router = Router();

router.use('/verticals', verticalRoutes);
router.use('/templates', TemplateRotes);
router.use('/assets', assetRoutes);
router.use('/campaigns', campaignRoutes);

export default router;
