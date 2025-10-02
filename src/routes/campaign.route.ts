import { Router, Request, Response, NextFunction } from 'express';
import CampaignService from '../services/campaign.service';
import { CampaignIn } from '../interfaces/campaign.interface';
import createLogger from '../config/logger';
import multer from 'multer';
import filepath from 'path';
import fs from 'fs';
const logger = createLogger(module);
const router = Router();

// Disk storage configuration for images
const uploadDir = filepath.join(process.cwd(), 'uploads', 'images for campaigns');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = filepath.extname(file.originalname);
    const baseName = filepath.basename(file.originalname, ext);
    const customName = `${baseName}-${timestamp}-${randomSuffix}${ext}`;
    cb(null, customName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg'];
    const ext = filepath.extname(file.originalname).toLowerCase();

    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg and .jpeg image formats are allowed!'));
    }
  },
});

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
    logger.error(`${error.message}`);
    let status = 500;
    const message = error.message || 'Internal Server Error';

    if (/required|invalid/i.test(message)) status = 400;
    else if (/already exists/i.test(message)) status = 409;
    else if (/not belong to Vertical|not found|does not exist|do not exist/i.test(message)) status = 404;

    res.status(status).json({ message });
  }
});

router.get('/list', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaigns = await CampaignService.list(req.query);
    res.status(200).json(campaigns);
  } catch (error: any) {
    logger.error(`${error.message}`);
    const message = error.message || 'Internal Server Error';
    res.status(500).json({ message });
  }
});

router.get('/:campaignId/get', async (req: Request, res: Response, next: NextFunction) => {
  try {
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

// POST /api/v1/campaigns/image/upload
router.post('/image/upload', upload.single('images'), async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;
    const file = req.file;

    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId is required' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Valid image file (.png, .jpg, .jpeg) is required'});
    }

    const result = await CampaignService.uploadImage(campaignId, file);
    res.status(200).json(result);
  } catch (error:any) {
    const message =error.message || 'Internal Server Error'
    res.status(400).json({message});
  }
});
export default router;
