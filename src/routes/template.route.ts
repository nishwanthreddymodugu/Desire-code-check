import { Router, Request, Response } from 'express';
import TemplateService from '../services/template.service';
import { TemplateIn } from '../interfaces/template.interface';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import createLogger from '../config/logger';

const logger = createLogger(module);
const templateRouter = Router();

// MAX_FILE_SIZE for images
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

/* ---------------- TEMPLATE IMAGE UPLOAD CONFIG ---------------- */
const templateImageDir = path.join(process.cwd(), 'uploads', 'images-for-templates');
fs.mkdir(templateImageDir, { recursive: true });

const templateImageStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, templateImageDir); },
  filename: (req, file, cb) => { cb(null, file.originalname); },
});

const templateImageUpload = multer({
  storage: templateImageStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) { cb(null, true); }
    else { cb(new Error('Only .png, .jpg and .jpeg image formats are allowed!')); }
  },
});

templateRouter.post('/save', async (req: Request, res: Response) => {
  try {
    const { templateId, templatename, verticalId } = req.body;
    const verticalIdAsNumber = Number(verticalId);

    if (isNaN(verticalIdAsNumber)) {
      logger.error('A valid numeric verticalId is required.');
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
      logger.error('A valid numeric verticalId query parameter is required.');
      return res.status(400).json({ message: 'A valid numeric verticalId query parameter is required.' });
    }

    const templates = await TemplateService.list(verticalId);
    res.status(200).json(templates);
  } catch (error: any) {
    logger.error(`${error.message}`);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});

templateRouter.get('/:templateId', async (req: Request, res: Response) => {
  try {
    const templateId = Number(req.params.templateId);
    if (isNaN(templateId)) {
      logger.error('A valid numeric templateId is required.');
      return res.status(400).json({ message: 'A valid numeric templateId is required.' });
    }

    const template = await TemplateService.getById(templateId);
    res.status(200).json(template);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      logger.error(`${error.message}`);
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
});


/* ---------------- TEMPLATE IMAGE UPLOAD ROUTE ---------------- */
templateRouter.post(
  '/image/upload',
  templateImageUpload.array('images'),
  async (req: Request, res: Response) => {
    const { verticalId, templateId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!verticalId || !templateId) {
      logger.error('verticalId and templateId are required');
      return res.status(400).json({ message: 'verticalId and templateId are required' });
    }

    if (!files || files.length === 0) {
      logger.error('Valid image files (.png, .jpg, .jpeg) are required');
      return res.status(400).json({ message: 'Valid image files (.png, .jpg, .jpeg) are required' });
    }

    try {
      const results = await Promise.all(
        files.map(file => TemplateService.uploadImage(Number(verticalId), Number(templateId), file))
      );
      res.status(200).json(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      logger.error(message);
      res.status(500).json({ message: message || 'Internal Server Error' });
    }
  }
);

export default templateRouter;