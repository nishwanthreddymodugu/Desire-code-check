import { Router, Request, Response, NextFunction } from 'express';
import CampaignService from '../services/campaign.service';
import { CampaignIn } from '../interfaces/campaign.interface';
import createLogger from '../config/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const logger = createLogger(module);
const router = Router();
//common MAX_FILE_SIZE for images and csv
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

/* ---------------- IMAGE UPLOAD CONFIG ---------------- */
const imageUploadDir = path.join(process.cwd(), 'uploads', 'images for campaigns');
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imageUploadDir),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) cb(null, true);
    else cb(new Error('Only .png, .jpg and .jpeg image formats are allowed!'));
  },
});

/* ---------------- CSV UPLOAD CONFIG ---------------- */
const csvUploadDir = path.join(process.cwd(), 'uploads', 'csv for campaigns');
if (!fs.existsSync(csvUploadDir)) {
  fs.mkdirSync(csvUploadDir, { recursive: true });
}

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, csvUploadDir),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const csvUpload = multer({
  storage: csvStorage,
  limits: { fileSize: MAX_FILE_SIZE }, // using the same constant
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed. Please upload a valid .csv file.'));
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
// Image upload
router.post('/image/upload', imageUpload.single('images'), async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;
    const file = req.file;
      if (!campaignId) {
        logger.warn('campaignId are required');
        return res.status(400).json({ warn: 'campaignId are required' });
      }

      if (!file) {
        logger.warn('Valid image file (.png, .jpg, .jpeg) is required');
        return res.status(400).json({ warn: 'Valid image file (.png, .jpg, .jpeg) is required'});
      }

    const result = await CampaignService.uploadImage(campaignId, file);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Internal Server Error' });
  }
});

// CSV upload
router.post('/csv/upload', csvUpload.single('csv'), async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;
    const file = req.file;
      if (!campaignId) {
        logger.warn('campaignId are required');
        return res.status(400).json({ warn: 'campaignId are required' });
      }

      if (!file) {
        logger.warn('CSV file is required in "csv" key.');
        return res.status(400).json({ warn: 'CSV file is required in "csv" key.'});
      }
    // if (!campaignId) return res.status(400).json({ message: 'campaignId is required in request body.' });
    // if (!file) return res.status(400).json({ message: 'CSV file is required in "csv" key.' });

    const result = await CampaignService.uploadCSV(Number(campaignId), file);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Internal Server Error' });
  }
});

export default router;