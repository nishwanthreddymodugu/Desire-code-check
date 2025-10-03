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

export default verticalRouter;
