// import { Router } from "express";
// import verticalRoutes from './vertical.route';
// import TemplateRoutes from './template.route';
// import assetRoutes from './asset.route';
// import campaignRoutes from './campaign.route';
// import authRoutes from './auth.route';
// const router = Router();

// router.use('/verticals', verticalRoutes);
// router.use('/templates', TemplateRoutes);
// router.use('/assets', assetRoutes);
// router.use('/campaigns', campaignRoutes);
// router.use('/auth', authRoutes);

// export default router;

import { Router } from "express";
import verticalRoutes from './vertical.route';
import TemplateRoutes from './template.route';
import assetRoutes from './asset.route';
import campaignRoutes from './campaign.route';
//import { authMiddleware } from '../middlewares/auth.middleware';
import authRouter from "./auth.route";
const router = Router();


router.use('/verticals',  verticalRoutes);
router.use('/templates', TemplateRoutes);
router.use('/assets', assetRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/auth', authRouter);

export default router;