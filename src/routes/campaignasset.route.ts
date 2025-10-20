import { Router, Request, Response } from 'express';
import CampaignAssetService from '../services/campaignasset.service';
import createLogger from '../config/logger';

const logger = createLogger(module);
const router = Router();

router.get('/:campaignId/:assetId/get', async (req: Request, res: Response) => {
  const campaignId = Number(req.params.campaignId);
  const assetId = Number(req.params.assetId);

  if (Number.isNaN(campaignId) || Number.isNaN(assetId)) {
    logger.error('Valid numeric campaignId and assetId are required.');
    return res.status(400).json({ message: 'Valid campaignId and assetId are required.' });
  }

  try {
    const asset = await CampaignAssetService.getByCampaignAsset(campaignId, assetId);
    return res.status(200).json(asset);
  } catch (error: unknown) {
    logger.error(error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    if (/not found/i.test(message)) {
      return res.status(404).json({ message });
    }

    return res.status(500).json({ error: message });
  }
});

export default router;
