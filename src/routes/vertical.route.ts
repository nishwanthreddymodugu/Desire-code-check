import { Router, Request, Response } from "express";
import VerticalService from "../services/vertical.service";
import { VerticalIn } from "../interfaces/vertical.interface";
import logger from "../config/logger"; // Import Winston logger

const verticalRouter = Router();

// Save Vertical
verticalRouter.post("/save", async (req: Request, res: Response) => {
  logger.info(`POST /vertical/save called with data: ${JSON.stringify(req.body)}`);

  try {
    const { verticalId, verticalname } = req.body;
    const verticalIn: VerticalIn = { verticalId, verticalname };

    const verticalOut = await VerticalService.save(verticalIn);
    logger.info(`Vertical saved successfully: ${JSON.stringify(verticalOut)}`);

    res.status(201).json(verticalOut);
  } catch (error: any) {
    let status = 500;

    if (error.message.includes("required")) {
      status = 400;
    } else if (error.message.includes("already exists")) {
      status = 409;
    }

    logger.error(`Error in POST /vertical/save: ${error.message}`);
    res.status(status).json({ message: error.message });
  }
});

// List Verticals
verticalRouter.get("/list", async (_req: Request, res: Response) => {
  logger.info("GET /vertical/list called");

  try {
    const verticals = await VerticalService.list();
    logger.info(`Verticals fetched successfully: ${JSON.stringify(verticals)}`);

    res.status(200).json(verticals);
  } catch (error: any) {
    let status = 500;

    if (error.message.includes("No verticals")) {
      status = 404;
    }

    logger.error(`Error in GET /vertical/list: ${error.message}`);
    res.status(status).json({ message: error.message });
  }
});

export default verticalRouter;
