import { Router, Request, Response, NextFunction } from 'express';
import CampaignService from '../services/campaign.service';
import { CampaignIn } from '../interfaces/campaign.interface';

const router = Router();

// Route for creating a new campaign
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
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
    res.status(201).json(campaignOut);
  } catch (error: any) {
    let status = 500;
const message = error.message || 'Internal Server Error';

if (/required|invalid/i.test(message)) {
  status = 400; // Bad Request
} else if (/already exists/i.test(message)) {
  status = 409; // Conflict
} else if (/not belong to Vertical|not found|does not exist|do not exist/i.test(message)) {
  status = 404; // Not Found (includes your 'does not exist' errors)
}

res.status(status).json({ message });

  }
});

router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaigns = await CampaignService.list(req.query);
    res.status(200).json(campaigns);
  } catch (error: any) {
    const message = error.message || 'Internal Server Error';
    res.status(500).json({ message });
  }
});

router.get('/:campaignId/get', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      return res.status(400).json({ message: 'A valid numeric campaignId is required.' });
    }
    const campaign = await CampaignService.getById(campaignId);
    res.status(200).json(campaign);
  } catch (error: any) {
    let status = 500;
    const message = error.message || 'Internal Server Error';

    if (/not found/i.test(message)) {
      status = 404;
    }

    res.status(status).json({ message });
  }
});

export default router;
