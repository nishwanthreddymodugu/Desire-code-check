import { Router, Request, Response, NextFunction } from 'express';
import AssetService from '../services/asset.service';
import { AssetIn } from '../interfaces/asset.interface';
import createLogger from '../config/logger';

const logger = createLogger(module);
const router = Router();

router.post('/save', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetId, assetname, description, figmaURL, figmaId, templateId, verticalId } = req.body;
    const templateIdAsNumber = Number(templateId);
    const verticalIdAsNumber = Number(verticalId);

    const assetIn: AssetIn = {
      assetId: assetId ? Number(assetId) : undefined,
      assetname,
      description,
      figmaURL,
      figmaId,
      templateId: templateIdAsNumber,
      verticalId: verticalIdAsNumber,
    };

    const assetOut = await AssetService.save(assetIn);
    res.status(201).json(assetOut);
  } catch (error: any) {
    logger.error(`${error.message}`);
    let status = 500;

    if (error.message.includes('required')) status = 400;
    else if (error.message.includes('already exists')) status = 409;
    else if (error.message.includes('does not exist')) status = 404;

    res.status(status).json({ message: error.message });
  }
});

router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = Number(req.query.templateId);
    if (isNaN(templateId)) {
      logger.error('A valid numeric templateId query parameter is required.');
      return res.status(400).json({ message: 'A valid numeric templateId query parameter is required.' });
    }

    const assets = await AssetService.list(templateId);
    res.status(200).json(assets);
  } catch (error: any) {
    logger.error(`${error.message}`);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

export default router;
