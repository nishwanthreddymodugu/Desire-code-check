import { Router, Request, Response } from 'express';
import CampaignAssetService from '../services/campaignasset.service';
import createLogger from '../config/logger';

const logger = createLogger(module);
const router = Router();

router.get('/:campaignId/:assetId/get', async (req: Request, res: Response) => {
  try {
    const campaignId = Number(req.params.campaignId);
    const assetId = Number(req.params.assetId);

    if (isNaN(campaignId) || isNaN(assetId)) {
      logger.error('Valid numeric campaignId and assetId are required.');
      return res.status(400).json({ message: 'Valid campaignId and assetId are required.' });
    }

    const asset = await CampaignAssetService.getByCampaignAndAsset(campaignId, assetId);
    res.status(200).json(asset);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch campaign asset';
    if (/not found/i.test(message)) {
      logger.error(message);
      return res.status(404).json({ message });
    }
    logger.error(message);
    res.status(500).json({ message });
  }
});

export default router;
