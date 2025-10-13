import { Router, Request, Response, NextFunction } from 'express';
import CampaignService from '../services/campaign.service';
import { CampaignIn } from '../interfaces/campaign.interface';
import createLogger from '../config/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import campaignService from '../services/campaign.service';

const logger = createLogger(module);
const router = Router();

// Common MAX_FILE_SIZE for images and CSVs
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

/* ---------------- IMAGE UPLOAD CONFIG ---------------- */
const imageUploadDir = path.join(process.cwd(), 'uploads', 'images-for-campaigns');
fs.mkdir(imageUploadDir, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, imageUploadDir); },
  filename: (req, file, cb) => { cb(null, file.originalname); },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) { cb(null, true); }
    else { cb(new Error('Only .png, .jpg and .jpeg image formats are allowed!')); }
  },
});

/* ---------------- CSV UPLOAD CONFIG ---------------- */
const csvUploadDir = path.join(process.cwd(), 'uploads', 'csv-for-campaigns');
fs.mkdir(csvUploadDir, { recursive: true });

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, csvUploadDir); },
  filename: (req, file, cb) => { cb(null, file.originalname); },
});

const csvUpload = multer({
  storage: csvStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
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
      logger.error('A valid numeric campaignId is required.');
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
/* ---------------- IMAGE UPLOAD ROUTE ---------------- */
router.post('/image/upload', imageUpload.array('images'), async (req: Request, res: Response) => {
  const { campaignId } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!campaignId) {
    logger.error('campaignId is required');
    return res.status(400).json({ message: 'campaignId is required' });
  }

  if (!files || files.length === 0) {
    logger.error('Valid image files (.png, .jpg, .jpeg) are required');
    return res.status(400).json({ message: 'Valid image files (.png, .jpg, .jpeg) are required' });
  }

  try {
    const results = await Promise.all(files.map(file => CampaignService.uploadImage(Number(campaignId), file)));
    res.status(200).json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    logger.error(message);
    res.status(500).json({ error: message });
  }
});

/* ---------------- CSV UPLOAD ROUTE ---------------- */
router.post('/csv/upload', csvUpload.array('csv'), async (req: Request, res: Response) => {
  const { campaignId } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!campaignId) {
    logger.error('campaignId is required');
    return res.status(400).json({ message: 'campaignId is required' });
  }

  if (!files || files.length === 0) {
    logger.error('CSV file(s) are required in "csv" key.');
    return res.status(400).json({ message: 'CSV file(s) are required in "csv" key.' });
  }

  try {
    const results = await Promise.all(files.map(file => CampaignService.uploadCSV(Number(campaignId), file)));
    res.status(200).json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    logger.error(message);
    res.status(500).json({ error: message });
  }
});
//----------------------------upload to exportimage s3-----------------------------
router.post('/image/exported/upload', imageUpload.array('images'), async (req: Request, res: Response) => {
  const { campaignId } = req.body;
  const {requestId}=req.body;
  const files = req.files as Express.Multer.File[];

  if (!campaignId) {
    logger.error('campaignId is required');
    return res.status(400).json({ message: 'campaignId is required' });
  }
  if(!requestId){
    logger.error('requestId is required');
    return res.status(400).json({ message: 'requestId is required' });
  }

  if (!files || files.length === 0) {
    logger.error('Valid image files (.png, .jpg, .jpeg) are required');
    return res.status(400).json({ message: 'Valid image files (.png, .jpg, .jpeg) are required' });
  }

  try {
    const results = await Promise.all(files.map(file => CampaignService.uploadexportedImage(Number(campaignId), Number(requestId), file)));
    res.status(200).json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    logger.error(message);
    res.status(500).json({ error: message });
  }
});


/* ---------------- GET IMAGE FROM LOCALSTACK ---------------- */
router.get('/:campaignId/images/:imageName', async (req, res) => {
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

/* ---------------- UPLOAD ASSET IMAGE ROUTE ---------------- */
router.post(
  '/image/asset/upload',
  imageUpload.single('image'),
  async (req: Request, res: Response) => {
    const { campaignId, assetId, requestId } = req.body;
    const file = req.file;

    if (!campaignId || !assetId || !requestId) {
      logger.error('campaignId, assetId, and requestId are required');
      return res.status(400).json({ message: 'campaignId, assetId, and requestId are required' });
    }

    if (!file) {
      logger.error('Image file missing');
      return res.status(400).json({ message: 'Image file is required' });
    }

    try {
      const result = await CampaignService.uploadAssetImage(
        Number(campaignId),
        Number(assetId),
        Number(requestId),
        file
      );

      res.status(200).json({
        message: 'Asset image uploaded successfully',
        ...result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      logger.error(message);
      res.status(500).json({ error: message });
    }
  }
);

export default router;