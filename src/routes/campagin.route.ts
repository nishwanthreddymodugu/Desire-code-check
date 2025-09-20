import { Router, Request, Response, NextFunction } from 'express';
import CampaignService from '../services/campaign.service';
import { CampaignIn } from '../interfaces/campaign.interface';
import logger from '../config/logger'; // Import Winston logger

const router = Router();

// Route for creating a new campaign
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`POST /create called with data: ${JSON.stringify(req.body)}`);

  try {
    const { campaignname, description, fromdate, todate, verticalId, templateId, assets } = req.body;

    const campaignIn: CampaignIn = {
      campaignname,
      description,
      fromdate,
      todate,
      verticalId: Number(verticalId),
      templateId: Number(templateId),
      assets: assets.map((id: string) => Number(id)),
    };

    const campaignOut = await CampaignService.create(campaignIn);
    logger.info(`Campaign created successfully: ${JSON.stringify(campaignOut)}`);

    res.status(201).json(campaignOut);
  } catch (error: any) {
    const message = error.message || 'Internal Server Error';
    let status = 500;

    if (/required|invalid/i.test(message)) {
      status = 400;
    } else if (/already exists/i.test(message)) {
      status = 409;
    } else if (/not belong to Vertical|not found|does not exist|do not exist/i.test(message)) {
      status = 404;
    }

    logger.error(`Error in POST /create: ${message}`);
    res.status(status).json({ message });
  }
});

// Route for listing campaigns
router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`GET /list called with query: ${JSON.stringify(req.query)}`);

  try {
    const campaigns = await CampaignService.list(req.query);
    logger.info(`Campaigns fetched successfully: ${JSON.stringify(campaigns)}`);
    res.status(200).json(campaigns);
  } catch (error: any) {
    const message = error.message || 'Internal Server Error';
    logger.error(`Error in GET /list: ${message}`);
    res.status(500).json({ message });
  }
});

// Route for fetching campaign by ID
router.get('/:campaignId/get', async (req: Request, res: Response, next: NextFunction) => {
  logger.info(`GET /${req.params.campaignId}/get called`);

  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      logger.warn('Invalid campaignId provided');
      return res.status(400).json({ message: 'A valid numeric campaignId is required.' });
    }

    const campaign = await CampaignService.getById(campaignId);
    logger.info(`Campaign fetched successfully: ${JSON.stringify(campaign)}`);

    res.status(200).json(campaign);
  } catch (error: any) {
    const message = error.message || 'Internal Server Error';
    let status = 500;

    if (/not found/i.test(message)) {
      status = 404;
    }

    logger.error(`Error in GET /${req.params.campaignId}/get: ${message}`);
    res.status(status).json({ message });
  }
});

export default router;