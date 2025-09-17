import { Router } from "express";
//import { authMiddleware } from './middleware/auth.middleware';

// Import all service handlers
//import AuthService from './services/auth.service';
import CampaignService from "../services/campaign.service";
//import TemplateService from "../services/template.service";
//import AssetService from "../services/asset.service";
//import vertical from "../services/vertical.service";
//import { VerticalIn, VerticalOut } from "../interfaces/vertical.interface";
import verticalRoutes from './vertical.route';
import TemplateRotes from './template.route';
import assetRoutes from './asset.route';
import campaignRoutes from './campagin.route';
const router = Router();

// --- Public Authentication Routes ---
// router.post('/auth/signup', AuthService.signup);
// router.post('/auth/login', AuthService.login);

// --- Protected Vertical Routes ---
// router.post("/verticals/save", async (req, res) => {
//   const body = req.body;

//   const verticalIn: VerticalIn = {
//     verticalname: body.verticalname,
//     verticalId: body.verticalId,
//   };

//   try {
//     const verticalOut: VerticalOut = await vertical.save(verticalIn);
//     res.send(verticalOut);
//   } catch (error) {
//     res.send("Error");
//   }
// });

//router.get("/verticals/list", verticalRoutes);
router.use('/verticals', verticalRoutes);

// --- Protected Template Routes ---
router.use('/templates', TemplateRotes);
//router.post('/templates/update/:templateId', TemplateService.update);
//router.get("/templates/list", TemplateService.list);

// --- Protected Asset Routes ---
//router.post("/assets/save", AssetService.save);
//router.post('/assets/update/:assetId', AssetService.update);
//router.get("/assets/list", AssetService.list);
router.use('/assets', assetRoutes);

// --- Protected Campaign Routes ---
// router.post("/campaigns/save", CampaignService.create);
// router.get("/campaigns/list", CampaignService.list);
// router.get("/campaigns/:campaignId/get", CampaignService.getById);
// router.put("/campaigns/:campaignId", CampaignService.update);
// router.post(
//   "/campaigns/:campaignId/assets/update",
//   CampaignService.updateAssets
// );
router.use('/campaigns', campaignRoutes);

export default router;
