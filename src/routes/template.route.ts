import { Router, Request, Response } from 'express';
import TemplateService from '../services/template.service';
import { TemplateIn } from '../interfaces/template.interface';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import createLogger from '../config/logger';

const logger = createLogger(module);
const templateRouter = Router();

// Disk storage for template images
const uploadDir = path.join(process.cwd(), 'uploads', 'images for templates');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const customName = `${baseName}-${timestamp}-${randomSuffix}${ext}`;
    cb(null, customName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1 MB
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg and .jpeg image formats are allowed!'));
    }
  },
});

templateRouter.post('/save', async (req: Request, res: Response) => {
  try {
    const { templateId, templatename, verticalId } = req.body;
    const verticalIdAsNumber = Number(verticalId);

    if (isNaN(verticalIdAsNumber)) {
      logger.warn('A valid numeric verticalId is required.');
      return res.status(400).json({ message: 'A valid numeric verticalId is required.' });
    }

    const templateIn: TemplateIn = {
      templateId: templateId ? Number(templateId) : undefined,
      templatename,
      verticalId: verticalIdAsNumber,
    };

    const templateOut = await TemplateService.save(templateIn);
    res.status(201).json(templateOut);
  } catch (error: any) {
    logger.error(`${error.message}`);
    let status = 500;
    if (error.message.includes('required')) status = 400;
    else if (error.message.includes('already exists')) status = 409;
    else if (error.message.includes('does not exist')) status = 404;

    res.status(status).json({ message: error.message });
  }
});

templateRouter.get('/list', async (req: Request, res: Response) => {
  try {
    const verticalId = Number(req.query.verticalId);
    if (isNaN(verticalId)) {
      logger.warn('A valid numeric verticalId query parameter is required.');
      return res.status(400).json({ message: 'A valid numeric verticalId query parameter is required.' });
    }

    const templates = await TemplateService.list(verticalId);
    res.status(200).json(templates);
  } catch (error: any) {
    logger.error(`${error.message}`);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

// POST /api/v1/templates/image/upload
templateRouter.post(
  '/image/upload',
  upload.single('images'),
  async (req: Request, res: Response) => {
    try {
      const { verticalId, templateId } = req.body;
      const file = req.file;

      if (!verticalId || !templateId) {
        return res.status(400).json({ error: 'verticalId and templateId are required' });
      }

      if (!file) {
        return res.status(400).json({ error: 'Valid image file (.png, .jpg, .jpeg) is required' });
      }

      // Call service to handle response 
      const result = await TemplateService.uploadImage(verticalId, templateId, file);

      res.status(200).json(result);
    } catch (error:any) {
    const message =error.message || 'Internal Server Error'
    res.status(400).json({message});
    }
  }
);

export default templateRouter;
