import { Router, Request, Response, NextFunction } from 'express';
import CampaignService from '../services/campaign.service';
import { CampaignIn } from '../interfaces/campaign.interface';
import createLogger from '../config/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { getUser } from '../utils/auth';
import campaignService from '../services/campaign.service';

const logger = createLogger(module);
const CampaignRouter = Router();
const upload = multer();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/* ---------------- IMAGE UPLOAD CONFIG ---------------- */
const imageUploadDir = path.join(process.cwd(), 'uploads', 'images-for-campaigns');
fs.mkdir(imageUploadDir, { recursive: true }).catch(() => {});

const imageStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, imageUploadDir),
  filename: (_, file, cb) => cb(null, file.originalname),
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowedExts.includes(ext)
      ? cb(null, true)
      : cb(new Error('Only .png, .jpg and .jpeg image formats are allowed!'));
  },
});

/* ---------------- CSV UPLOAD CONFIG ---------------- */
const csvUploadDir = path.join(process.cwd(), 'uploads', 'csv-for-campaigns');
fs.mkdir(csvUploadDir, { recursive: true }).catch(() => {});
const csvStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, csvUploadDir),
  filename: (_, file, cb) => cb(null, file.originalname),
});

const csvUpload = multer({
  storage: csvStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed. Please upload a valid .csv file.'));
    }
  },
});

/* ---------------- CREATE CAMPAIGN ---------------- */
CampaignRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const { campaignname, description, fromdate, todate, verticalId, templateId, assets } = req.body;

    if (!campaignname || !verticalId || !templateId || !assets) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields. Must include campaignname, verticalId, templateId, and assets array.',
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
      createdByUserID: Number(user?.id),
      createdByName: user?.name,
      assets: assets.map((id: string) => Number(id)),
    };

    const campaignOut = await CampaignService.create(campaignIn);
    res.status(201).json(campaignOut);
  } catch (error: any) {
    logger.error(`Route Error in /campaigns/create: ${error.message}`);
    const message = error.message || 'Internal Server Error';
    let status = 500;

    if (/required|invalid/i.test(message)) status = 400;
    else if (error.name === 'SequelizeUniqueConstraintError' || /already exists/i.test(message)) status = 409;
    else if (/not belong to Vertical|not found|does not exist/i.test(message)) status = 404;

    res.status(status).json({ message });
  }
});

/* ---------------- LIST CAMPAIGNS ---------------- */
CampaignRouter.get('/list', async (req: Request, res: Response) => {
  try {
    const campaigns = await CampaignService.list(req.query);
    res.status(200).json(campaigns);
  } catch (error: any) {
    logger.error(error.message);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

/* ---------------- GET CAMPAIGN BY ID ---------------- */
CampaignRouter.get('/:campaignId/get', async (req: Request, res: Response) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) return res.status(400).json({ message: 'Invalid campaignId' });

    const campaign = await CampaignService.getById(campaignId);
    res.status(200).json(campaign);
  } catch (error: any) {
    logger.error(error.message);
    const status = /not found/i.test(error.message) ? 404 : 500;
    res.status(status).json({ message: error.message || 'Internal Server Error' });
  }
});

/* ---------------- IMAGE UPLOAD ROUTE ---------------- */
CampaignRouter.post('/image/upload', imageUpload.array('images'), async (req, res) => {
  const { campaignId } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!campaignId) return res.status(400).json({ message: 'campaignId is required' });
  if (!files?.length) return res.status(400).json({ message: 'Image files are required' });

  try {
    const results = await Promise.all(files.map(file => CampaignService.uploadImage(Number(campaignId), file)));
    res.status(200).json(results);
  } catch (err: any) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- CSV UPLOAD ROUTE ---------------- */
CampaignRouter.post('/csv/upload', csvUpload.array('csv'), async (req, res) => {
  const { campaignId } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!campaignId) return res.status(400).json({ message: 'campaignId is required' });
  if (!files?.length) return res.status(400).json({ message: 'CSV files are required' });

  try {
    const results = await Promise.all(files.map(file => CampaignService.uploadCSV(Number(campaignId), file)));
    res.status(200).json(results);
  } catch (err: any) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- GET IMAGE FROM LOCALSTACK ---------------- */
CampaignRouter.get('/:campaignId/images/:imageName', async (req, res) => {
  try {
    const { campaignId, imageName } = req.params;
    const s3Prefix = `campaigns/${campaignId}/images/${imageName}`;

    const imageBuffer = await campaignService.getCampaignImage(s3Prefix);

    const ext = path.extname(imageName).toLowerCase();
    let contentType = '';

    if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else {
      return res.status(400).json({ error: 'Unsupported image format. Only JPG, JPEG, and PNG are allowed.' });
    }

    res.setHeader('Content-Type', contentType);
    res.send(imageBuffer);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/* ---------------- EXPORTED IMAGE UPLOAD ---------------- */
CampaignRouter.post('/image/exported/upload', imageUpload.array('images'), async (req, res) => {
  const { campaignId, requestId } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!campaignId || !requestId) return res.status(400).json({ message: 'campaignId and requestId are required' });
  if (!files?.length) return res.status(400).json({ message: 'Image files are required' });

  try {
    const results = await CampaignService.uploadExportedImages(Number(campaignId), Number(requestId), files);
    res.status(200).json(results);
  } catch (err: any) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

CampaignRouter.get('/:campaignId/images/exported/:requestId',
  async (req: Request, res: Response) => {
    try {
      const { campaignId, requestId } = req.params;

      const { buffer, contentType } = await CampaignService.getExportedImage(
        Number(campaignId),
        Number(requestId)
      );

      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve image';
      logger.error(message);
      res.status(404).json({ error: message });
    }
  }
);

/* ---------------- UPLOAD ASSET IMAGE ROUTE ---------------- */
CampaignRouter.post('/image/asset/upload', imageUpload.single('image'), async (req, res) => {
  const { campaignId, assetId } = req.body;
  const file = req.file;

  if (!campaignId || !assetId)
    return res.status(400).json({ message: 'campaignId and assetId are required' });
  if (!file) return res.status(400).json({ message: 'Image file is required' });

  try {
    const result = await CampaignService.uploadAssetImage(Number(campaignId), Number(assetId), file);
    res.status(201).json(result);
  } catch (err: any) {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
  }
});


/* ---------------- GET IMAGE BY ASSET ID ---------------- */
CampaignRouter.get('/:campaignId/asset/:assetId', async (req, res) => {
  try {
    const { campaignId, assetId } = req.params;
    const cId = Number(campaignId);
    const aId = Number(assetId);

    if (isNaN(cId) || isNaN(aId)) {
      return res.status(400).json({ error: 'campaignId and assetId must be valid numbers' });
    }

    const { buffer, contentType } = await CampaignService.getAssetImage(cId, aId);
    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (error: any) {
    logger.error(error.message);
    res.status(/not found/i.test(error.message) ? 404 : 500).json({ error: error.message });
  }
});

export default CampaignRouter;


