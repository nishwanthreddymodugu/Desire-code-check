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
const upload = multer();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    if (Number.isNaN(campaignId)) {
      return res.status(400).json({ message: 'Invalid campaignId' });
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

/* ---------------- GET IMAGE FROM LOCALSTACK ---------------- */

router.get('/:campaignId/images/:imageName', async (req, res) => {
  const { campaignId, imageName } = req.params;
  
  if (!campaignId || !imageName) {
    return res.status(400).json({
      error: 'campaignId and imageName are required parameters.'
    });
  }

  const ext = path.extname(imageName).toLowerCase();
  let contentType = '';

  if (ext === '.png') {
    contentType = 'image/png';
  } else if (ext === '.jpg' || ext === '.jpeg') {
    contentType = 'image/jpeg';
  } else {
    return res.status(400).json({
      error: 'Unsupported image format. Only JPG, JPEG, and PNG are allowed.'
    });
  }

  const s3Prefix = `campaigns/${campaignId}/images/${imageName}`;
  try {
    const imageBuffer = await campaignService.getCampaignImage(s3Prefix);
    res.setHeader('Content-Type', contentType);
    res.send(imageBuffer);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post(
  '/image/exported/upload',
  imageUpload.array('images'),
  async (req: Request, res: Response) => {
    const { campaignId, requestId } = req.body;
    const files = req.files as Express.Multer.File[];

    const numericCampaignId = Number(campaignId);
    const numericRequestId = Number(requestId);

    if (
      isNaN(numericCampaignId) ||
      isNaN(numericRequestId) ||
      !Array.isArray(files) ||
      files.length === 0
    ) {
      return res.status(400).json({
        error: 'Invalid input. Please provide valid campaignId, requestId, and at least one image file.',
      });
    }

    try {
      const results = await CampaignService.uploadExportedImages(
        numericCampaignId,
        numericRequestId,
        files
      );
      res.status(200).json(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      logger.error(message);
      res.status(500).json({ error: message });
    }
  }
);

router.get(
  '/:campaignId/images/exported/:requestId',
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

router.post(
  '/image/asset/upload',
  imageUpload.single('image'),
  async (req: Request, res: Response) => {
    const { campaignId, assetId } = req.body;
    const file = req.file;

    if (!campaignId || !assetId) {
      return res.status(400).json({ message: 'campaignId and assetId are required' });
    }

    if (!file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    try {
      const result = await CampaignService.uploadAssetImage(
        Number(campaignId),
        Number(assetId),
        file
      );

      const status =
        result.message === 'Image already exists for this assetId' ? 200 : 201;

      res.status(status).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      res.status(500).json({ error: message });
    }
  }
);

//To get image by assetId
router.get('/:campaignId/asset/:assetId', async (req: Request, res: Response) => {
  try {
    const { campaignId, assetId } = req.params;
    const cId = Number(campaignId);
    const aId = Number(assetId);

    if (Number.isNaN(cId) || Number.isNaN(aId)) {
      return res.status(400).json({ error: 'campaignId and assetId must be valid numbers' });
    }
    const { buffer, contentType } = await CampaignService.getAssetImage(cId, aId);

    res.setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (error: any) {
    const message = error.message || 'Failed to retrieve image';
    const status = /not found/i.test(message) ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
export default router;