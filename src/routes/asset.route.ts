import { Router, Request, Response, NextFunction } from 'express';
import AssetService from '../services/asset.service';
import { AssetIn } from '../interfaces/asset.interface';
import logger from '../config/logger';  

const router = Router();

// Save Asset API
router.post('/save', async (req: Request, res: Response, next: NextFunction) => {
  const { assetId, assetname, description, figmaURL, figmaId, templateId, verticalId } = req.body;
  logger.info(`POST /save called with data: ${JSON.stringify(req.body)}`);

  try {
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
    logger.info(`Asset saved successfully: ${JSON.stringify(assetOut)}`);

    res.status(201).json(assetOut);
  } catch (error: any) {
    let status = 500;

    if (error.message.includes('required')) {
      status = 400;
    } else if (error.message.includes('already exists')) {
      status = 409;
    } else if (error.message.includes('does not exist')) {
      status = 404;
    }

    logger.error(`Error in POST /save: ${error.message}`);
    res.status(status).json({ message: error.message });
  }
});

// List Assets API
router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`GET /list called with query: ${JSON.stringify(req.query)}`);
  
  try {
    const templateId = Number(req.query.templateId);
    if (isNaN(templateId)) {
      logger.warn('Invalid templateId query parameter provided');
      return res.status(400).json({ message: 'A valid numeric templateId query parameter is required.' });
    }

    const assets = await AssetService.list(templateId);
    logger.info(`Assets fetched for templateId ${templateId}: ${JSON.stringify(assets)}`);

    res.status(200).json(assets);
  } catch (error: any) {
    logger.error(`Error in GET /list: ${error.message}`);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

export default router;