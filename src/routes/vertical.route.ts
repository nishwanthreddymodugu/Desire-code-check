import { Router, Request, Response } from "express";
import VerticalService from "../services/vertical.service";
import { VerticalIn } from "../interfaces/vertical.interface";
import createLogger from '../config/logger';

const logger = createLogger(module);
const verticalRouter = Router();

verticalRouter.post("/save", async (req: Request, res: Response) => {
  try {
    const { verticalId, verticalname } = req.body;
    const verticalIn: VerticalIn = { verticalId, verticalname };

    const verticalOut = await VerticalService.save(verticalIn);
    res.status(201).json(verticalOut);

  } catch (error: any) {
    logger.error(`${error.message}`);
    let status = 500;
    if (error.message.includes("required")) status = 400;
    else if (error.message.includes("already exists")) status = 409;

    res.status(status).json({ message: error.message });
  }
});

verticalRouter.get("/list", async (_req: Request, res: Response) => {
  try {
    const verticals = await VerticalService.list();
    res.status(200).json(verticals);

  } catch (error: any) {
    logger.error(`${error.message}`);
    let status = 500;
    if (error.message.includes("No verticals")) status = 404;

    res.status(status).json({ message: error.message });
  }
});

// Get template images
verticalRouter.get('/:verticalId/templates/:templateId/images', async (req, res) => {
  try {
    const { verticalId, templateId } = req.params;
    const vId = Number(verticalId);
    const tId = Number(templateId);

    if (isNaN(vId) || isNaN(tId)) {
      return res.status(400).json({ error: 'Both verticalId and templateId must be valid numbers' });
    }

    const verticals = await VerticalService.list();
    const verticalExists = verticals.some(v => v.verticalId === vId);
    if (!verticalExists) return res.status(404).json({ error: `Vertical ${vId} not found` });

    const imagesPaths = await VerticalService.getTemplateImages(vId, tId);

    res.status(200).json({
      verticalId: vId,
      templateId: tId,
      images: imagesPaths,
    });
  } catch (error: any) {
    const message = error.message || 'Failed to retrieve template images';
    const status = /not found|no images/i.test(message) ? 404 : 500;
    logger.error(message);
    res.status(status).json({ error: message });
  }
});

// Get single image by verticalId, templateId, and imageName
verticalRouter.get('/:verticalId/templates/:templateId/images/:imageName', async (req, res) => {
  try {
    const { verticalId, templateId, imageName } = req.params;
    const vId = Number(verticalId);
    const tId = Number(templateId);

    if (isNaN(vId) || isNaN(tId) || !imageName) {
      return res.status(400).json({ error: 'verticalId, templateId, and imageName are required and must be valid' });
    }

    const imageBuffer = await VerticalService.getTemplateImage(vId, tId, imageName);

    // Detect content type from extension
    const ext = imageName.split('.').pop()?.toLowerCase();
    let contentType = '';
    if (ext === 'png') contentType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else return res.status(400).json({ error: 'Unsupported image format. Only JPG, JPEG, and PNG are allowed.' });

    res.setHeader('Content-Type', contentType);
    res.send(imageBuffer);
  } catch (error: any) {
    const message = error.message || 'Failed to retrieve image';
    const status = /not found/i.test(message) ? 404 : 500;
    logger.error(message);
    res.status(status).json({ error: message });
  }
});
export default verticalRouter;
