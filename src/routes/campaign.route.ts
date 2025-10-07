import { Router, Request, Response, NextFunction } from 'express';
import CampaignService from '../services/campaign.service';
import { CampaignIn } from '../interfaces/campaign.interface';
import { IUser } from '../interfaces/user.interface';
import createLogger from '../config/logger';

interface AuthRequest extends Request {
  user?: IUser;
}


const logger = createLogger(module);
const CampaignRouter = Router();

CampaignRouter.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignname, description, fromdate, todate, verticalId, templateId, assets } = req.body;
    const user = (req as AuthRequest).user;
    if (!user || !user.id || !user.name) {
        return res.status(401).json({ message: "User information is missing or incomplete in the token." });
    }
    if (!campaignname || !verticalId || !templateId || !assets) {
      return res.status(400).json({ 
        error: "Bad Request",
        message: "Missing required fields. Body must include campaignname, verticalId, templateId, and an assets array."
      });
    }
    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ message: "'assets' array cannot be empty." });
    }

    const campaignIn: CampaignIn = {
      campaignname,
      description,
      fromdate,
      todate,
      verticalId: Number(verticalId),
      templateId: Number(templateId),
      createdBy: {
        userId: user.id!,
        name: user.name
      },
      assets: assets.map((id: string) => Number(id)),
    };

    const campaignOut = await CampaignService.create(campaignIn);
    res.status(201).json(campaignOut);
  } catch (error: any) {
    logger.error(`Route Error in /campaigns/create: ${error.message}`);
    let status = 500;
    const message = error.message || 'Internal Server Error';

    if (/required|invalid/i.test(message)) status = 400;
    else if (error.name === 'SequelizeUniqueConstraintError' || /already exists/i.test(message)) {
      status = 409; 
      res.status(status).json({ message: `A campaign with the name '${req.body.campaignname}' already exists.` });
      return;
    } 
    else if (/not belong to Vertical|not found|does not exist|do not exist/i.test(message)) status = 404;

    res.status(status).json({ message });
  }
});

CampaignRouter.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user || !user.name) {
      return res.status(401).json({ message: "User information is missing from the token." });
    }
    const campaigns = await CampaignService.list(req.query);
    res.status(200).json(campaigns);
  } catch (error: any) {
    logger.error(`${error.message}`);
    const message = error.message || 'Internal Server Error';
    res.status(500).json({ message });
  }
});

CampaignRouter.get('/:campaignId/get', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as AuthRequest).user;
    if (!user || !user.name) {
      return res.status(401).json({ message: "User information is missing from the token." });
    }
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      logger.warn('A valid numeric campaignId is required.');
      return res.status(400).json({ message: 'A valid numeric campaignId is required.' });
    }

    const campaign = await CampaignService.getById(campaignId);
    res.status(200).json(campaign);
  } catch (error: any) {
    logger.error(`${error.message}`);
    let status = 500;
    if (/not found/i.test(error.message)) status = 404;
    res.status(status).json({ message: error.message || 'Internal Server Error' });
  }
});

export default CampaignRouter;
