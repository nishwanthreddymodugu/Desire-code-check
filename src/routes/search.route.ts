import { Router, Request, Response, NextFunction } from 'express';
import SearchService from '../services/search.service';
import { CampaignDocument } from '../interfaces/search.interface';

const SearchRouter = Router();

/**
 * [POST] /api/v1/search/campaign/index/create
 * A one-time setup endpoint to create the Elasticsearch index.
 */
SearchRouter.post('/campaign/index/create', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await SearchService.createCampaignIndex();
        res.status(200).json({ message: "Campaign search index created successfully." });
    } catch (error) {
        next(error);
    }
});

/**
 * [POST] /api/v1/search/campaign/add
 * Endpoint to add or update a campaign document in the search index.
 */
SearchRouter.post('/campaign/add', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const campaignDoc: CampaignDocument = req.body;
        // Basic validation in the route handler
        if (!campaignDoc.campaignId || !campaignDoc.campaignname) {
            return res.status(400).json({ message: "campaignId and campaignname are required."});
        }
        await SearchService.addCampaignToIndex(campaignDoc);
        res.status(200).json({ message: `Campaign ${campaignDoc.campaignId} indexed successfully.` });
    } catch (error) {
        next(error);
    }
});

/**
 * [GET] /api/v1/search/campaign/search
 * The main endpoint for searching campaigns.
 */
SearchRouter.get('/campaign/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // The route handler passes the raw query params to the service.
        const results = await SearchService.search(req.query);
        res.status(200).json(results);
    } catch (error) {
        next(error);
    }
});

export default SearchRouter;