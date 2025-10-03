import { Router, Request, Response } from 'express';
import TemplateService from '../services/template.service';
import { TemplateIn } from '../interfaces/template.interface';
import createLogger from '../config/logger';

const logger = createLogger(module);
const templateRouter = Router();

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

export default templateRouter;
