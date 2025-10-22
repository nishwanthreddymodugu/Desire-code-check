import { Router, Request, Response, NextFunction } from 'express';
import SearchService from '../services/search.service';
import { CampaignDocument, SearchQuery } from '../interfaces/search.interface';
import createLogger from '../config/logger';

const logger = createLogger(module);

const SearchRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateFormatError = "Invalid date format. Please use YYYY-MM-DD.";

SearchRouter.post('/campaign/index/create', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await SearchService.createCampaignIndex();
        res.status(200).json({ message: "Campaign search index created successfully." });
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
            const err = error as { status: number; message: string };
            logger.error(`Route Error in /campaign/index/create: ${err.message}`);
            return res.status(err.status).json({ message: err.message });
        }
        logger.error('Route Error in /campaign/index/create:', { error });
        res.status(500).json({ message: 'An unexpected error occurred.' });
    }
});

SearchRouter.post('/campaign/add', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaignDoc: CampaignDocument = req.body;
        if (!campaignDoc.campaignId || !campaignDoc.campaignname) {
            return res.status(400).json({ message: "campaignId and campaignname are required."});
        }
        const user = (req as any).user;
        if (!user || !user.name) {
            return res.status(401).json({ message: "User information is missing from the token." });
        }
        await SearchService.addCampaignToIndex(campaignDoc);
        res.status(200).json({ message: `Campaign ${campaignDoc.campaignId} indexed successfully.` });
    } catch (error: unknown) {
        
        if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
            const err = error as { status: number; message: string };
            logger.error(`Route Error in /campaign/add: ${err.message}`);
            return res.status(err.status).json({ message: err.message });
        }
        logger.error('Route Error in /campaign/add:', { error });
        res.status(500).json({ message: 'An unexpected error occurred.' });
    }
});

SearchRouter.get('/campaign/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = req.query;

        const filters: SearchQuery = {};
        if (query.q) filters.q = query.q as string;
        if (query.status) filters.status = query.status as string;
        if (query.createdBy) filters.createdBy = query.createdBy as string;
        if (query.createdAtFrom) filters.createdAtFrom = query.createdAtFrom as string;
        if (query.createdAtTo) filters.createdAtTo = query.createdAtTo as string;

        if (query.fromdate) {
            const fromdate = query.fromdate as string;
            
            if (!dateRegex.test(fromdate) || isNaN(new Date(fromdate).getTime())) {
                return res.status(400).json({ message: dateFormatError });
            }
            filters.fromdate = fromdate;
        }
        if (query.todate) {
            const todate = query.todate as string;
         
            if (!dateRegex.test(todate) || isNaN(new Date(todate).getTime())) {
                return res.status(400).json({ message: dateFormatError });
            }
            filters.todate = todate;
        }
     
        if (filters.fromdate && filters.todate && new Date(filters.fromdate) > new Date(filters.todate)) {
            return res.status(400).json({ message: "Validation failed: 'fromdate' cannot be later than 'todate'." });
        }
        
        if (query.verticalId) {
            const verticalId = Number(query.verticalId);
            if (isNaN(verticalId)) {
                return res.status(400).json({ message: "Validation failed: 'verticalId' must be a number." });
            }
            filters.verticalId = verticalId;
        }
        
        if (query.templateId) {
             const templateId = Number(query.templateId);
             if (isNaN(templateId)) {
                return res.status(400).json({ message: "Validation failed: 'templateId' must be a number." });
             }
             filters.templateId = templateId;
        }
        const results = await SearchService.search(filters);
        res.status(200).json(results);
    }
    catch (error: unknown) {
        
        if (typeof error === 'object' && error !== null && 'status' in error && 'message' in error) {
            const err = error as { status: number; message: string };
            logger.error(`Route Error in /campaign/search: ${err.message}`);
            return res.status(err.status).json({ message: err.message });
        }
        logger.error('Route Error in /campaign/search:', { error });
        res.status(500).json({ message: 'An unexpected error occurred.' });
    }
});

export default SearchRouter;