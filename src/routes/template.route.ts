import { Router, Request, Response } from 'express';
import TemplateService from '../services/template.service';
import { TemplateIn } from '../interfaces/template.interface';
import logger from '../config/logger'; // Import Winston logger

const templateRouter = Router();

// Save Template
templateRouter.post('/save', async (req: Request, res: Response) => {
  logger.info(`POST /template/save called with data: ${JSON.stringify(req.body)}`);

  try {
    const { templateId, templatename, verticalId } = req.body;
    const verticalIdAsNumber = Number(verticalId);

    if (isNaN(verticalIdAsNumber)) {
      logger.warn(`Invalid verticalId provided: ${verticalId}`);
      return res.status(400).json({ message: 'A valid numeric verticalId is required.' });
    }

    const templateIn: TemplateIn = {
      templateId: templateId ? Number(templateId) : undefined,
      templatename,
      verticalId: verticalIdAsNumber,
    };

    const templateOut = await TemplateService.save(templateIn);
    logger.info(`Template saved successfully: ${JSON.stringify(templateOut)}`);

    res.status(201).json(templateOut);
  } catch (error: any) {
    let status = 500;

    if (error.message.includes('required')) {
      status = 400;
    } else if (error.message.includes('already exists')) {
      status = 409;
    } else if (error.message.includes('does not exist')) {
      status = 404;
    }

    logger.error(`Error in POST /template/save: ${error.message}`);
    res.status(status).json({ message: error.message });
  }
});

// List Templates
templateRouter.get('/list', async (req: Request, res: Response) => {
  logger.info(`GET /template/list called with query: ${JSON.stringify(req.query)}`);

  try {
    const verticalId = Number(req.query.verticalId);
    if (isNaN(verticalId)) {
      logger.warn('Invalid verticalId query parameter provided');
      return res.status(400).json({ message: 'A valid numeric verticalId query parameter is required.' });
    }

    const templates = await TemplateService.list(verticalId);
    logger.info(`Templates fetched successfully for verticalId ${verticalId}: ${JSON.stringify(templates)}`);

    res.status(200).json(templates);
  } catch (error: any) {
    let status = 500;
    logger.error(`Error in GET /template/list: ${error.message}`);
    res.status(status).json({ message: error.message || 'Internal Server Error' });
  }
});

export default templateRouter;