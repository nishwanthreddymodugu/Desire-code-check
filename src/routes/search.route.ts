import { Router, Request, Response, NextFunction } from 'express';
import SearchService from '../services/search.service';
import { CampaignDocument } from '../interfaces/search.interface';
//import { authMiddleware } from '../middlewares/auth.middleware';
import createLogger from '../config/logger';

const logger = createLogger(module);

const SearchRouter = Router();


SearchRouter.post('/campaign/index/create', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await SearchService.createCampaignIndex();
        res.status(200).json({ message: "Campaign search index created successfully." });
    } catch (error: any) {
        logger.error(`Route Error in /campaign/index/create: ${error.message}`);
        let status = 500;
        const message = error.message || 'Internal Server Error';
        
        // Check for specific error types
        if (message.includes('Failed to create campaign index')) status = 500;
        
        res.status(status).json({ message });
    }
});

SearchRouter.post('/campaign/add', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaignDoc: CampaignDocument = req.body;
        if (!campaignDoc.campaignId || !campaignDoc.campaignname) {
            return res.status(400).json({ message: "campaignId and campaignname are required."});
        }
        // TypeScript fix: add type assertion for req.user
        const user = (req as any).user;
        if (!user || !user.name) {
            return res.status(401).json({ message: "User information is missing from the token." });
        }
        await SearchService.addCampaignToIndex(campaignDoc);
        res.status(200).json({ message: `Campaign ${campaignDoc.campaignId} indexed successfully.` });
    } catch (error: any) {
        logger.error(`Route Error in /campaign/add: ${error.message}`);
        let status = 500;
        const message = error.message || 'Internal Server Error';
        
        // Check for specific error types
        if (message.includes('Failed to add campaign to index')) status = 500;
        
        res.status(status).json({ message });
    }
});

SearchRouter.get('/campaign/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Basic input validation before delegating to the service
        const { verticalId, fromdate, todate } = req.query as Record<string, any>;
        if (verticalId !== undefined && !Number.isFinite(Number(verticalId))) {
            return res.status(400).json({ message: "'verticalId' must be a number." });
        }
        if (fromdate !== undefined && isNaN(new Date(fromdate).getTime())) {
            return res.status(400).json({ message: "'fromdate' is not a valid date." });
        }
        if (todate !== undefined && isNaN(new Date(todate).getTime())) {
            return res.status(400).json({ message: "'todate' is not a valid date." });
        }
        if (fromdate && todate && new Date(fromdate) > new Date(todate)) {
            return res.status(400).json({ message: "'fromdate' cannot be later than 'todate'." });
        }

        const results = await SearchService.search(req.query);
        res.status(200).json(results);
    } catch (error: any) {
        logger.error(`Route Error in /campaign/search: ${error.message}`);
        let status = 500;
        const message = error.message || 'Internal Server Error';
        
        // Check for specific error types
        if (message.includes('Validation failed:')) status = 400;
        else if (message.includes('Search operation failed:')) status = 500;
        
        res.status(status).json({ message });
    }
});

export default SearchRouter;