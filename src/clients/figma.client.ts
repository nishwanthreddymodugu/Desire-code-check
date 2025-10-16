// import axios from 'axios';
// import createLogger from '../config/logger';

// import * as dotenv from 'dotenv';

// dotenv.config();
// const logger = createLogger(module);

// const FIGMA_API_URL = process.env.FIGMA_API_URL;

// if (!FIGMA_API_URL) {
//     throw new Error("CRITICAL ERROR: FIGMA_API_URL is not defined in the .env file.");
// }

// class FigmaClient {
//     /**
//      * Sends an original Figma ID to the service to be cloned.
//      * @param originalFigmaId The ID of the master Figma file (e.g., "t85p6LbZ4l0Yx7tcsQBsEi").
//      * @returns An object containing the ID of the newly cloned file.
//      */
//     public async cloneFile(originalFigmaId: string): Promise<{ clonedFileId: string }> {
//         const endpoint = `${FIGMA_API_URL}/api/v1/figma/project/clone`; 
//         logger.debug(`[FigmaClient] Sending request to clone Figma ID: ${originalFigmaId}`);

//         try {
//             const response = await axios.post(
//                 endpoint,
//                 { projectId: originalFigmaId },
//                 {
//                     headers: { 'Content-Type': 'application/json' },
//                 }
//             );

//             logger.info(`[FigmaClient] Received successful clone response for ${originalFigmaId}.`);
            
//             const clonedFileId = response.data.cloneFileId;
//             if (!clonedFileId) {
//                 throw new Error("Figma API response did not contain a 'cloneFileId'.");
//             }
//             return { clonedFileId: clonedFileId };

//         } catch (error: any) {
//             logger.error(`[FigmaClient] Error calling Figma clone API for ID ${originalFigmaId}: ${error.message}`);
//             if (axios.isAxiosError(error) && error.response) {
//                 logger.error('Figma API Response Error Body:', error.response.data);
//             }
//             throw new Error('Failed to clone asset with Figma API.');
//         }
//     }
// }

// export default new FigmaClient();


// src/clients/figma.client.ts
import axios from 'axios';
import createLogger from '../config/logger';
import * as dotenv from 'dotenv';
const logger = createLogger(module);

dotenv.config();

const FIGMA_API_URL = process.env.FIGMA_API_URL;

if (!FIGMA_API_URL) {
    throw new Error("CRITICAL ERROR: FIGMA_API_URL is not defined in the .env file.");
}

class FigmaClient {
    /**
     * Sends an original Figma ID and its parent campaignId to the service to be cloned.
     * @param originalFigmaId The ID of the master Figma file.
     * @param campaignId The ID of the campaign this clone will belong to.
     * @param assetId The ID of the asset this clone will belong to.
     * @returns An object containing the ID of the newly cloned file.
     */
    public async cloneFile(originalFigmaId: string, campaignId: number, assetId: number): Promise<{ clonedFileId: string }> {
        const endpoint = `${FIGMA_API_URL}/api/v1/figma/project/clone`; 
        logger.debug(`[FigmaClient] Sending request to clone Figma ID: ${originalFigmaId} for Campaign ID: ${campaignId}`);

        try {
            const response = await axios.post(
                endpoint,
                { 
                    projectId: originalFigmaId,
                    campaignId: campaignId,
                    assetId: assetId
                },
                { headers: { 'Content-Type': 'application/json' } }
            );

            logger.info(`[FigmaClient] Received successful clone response for ${originalFigmaId}.`);
            
            //const cloneFileId = response.data.cloned;
            const clonedFileId = response.data?.clonedDetails?.clonedFileId;
            console.log('Clone response data:', response.data);
            const uploadError = response.data?.UploadDetails?.Error;
            if (uploadError) {
                // 2. If we find an error, we log it and throw our own error.
                //    This will trigger the transaction.rollback() in our CampaignService.
                logger.error(`[FigmaClient] Flask server returned a 200 OK but contained an S3 upload error:`, uploadError);
                throw new Error('The Figma service failed during the S3 upload phase.');
            }
            if (!clonedFileId) {
                throw new Error("Figma API response did not contain a 'clonedFileId'.");
            }
            return { clonedFileId: clonedFileId };

        } catch (error: any) {
            logger.error(`[FigmaClient] Error calling Figma clone API: ${error.message}`);
            if (axios.isAxiosError(error) && error.response) {
                logger.error('Figma API Response Error Body:', error.response.data);
            }
            throw new Error('Failed to clone asset with Figma API.');
        }
    }

//     // --- THIS IS THE NEW METHOD ---
//     /**
//      * Triggers the Figma service to export a final image for a given asset to S3.
//      * @param campaignId The ID of the parent campaign.
//      * @param assetId The ID of the master asset.
//      */
//     public async exportAssetImage(campaignId: number, assetId: number): Promise<void> {
//         const endpoint = `${FIGMA_API_URL}/api/v1/picasso/campaign/${campaignId}/asset/${assetId}/export`;
//         logger.info(`[FigmaClient] Triggering export for campaign ${campaignId}, asset ${assetId}`);

//         try {
//             // This is now a critical part of the main transaction. If it fails, the whole process will roll back.
//             // We use POST as it's common for triggering actions.
//             await axios.post(endpoint);
//             logger.info(`[FigmaClient] Successfully triggered export for asset ${assetId}.`);
//         } catch (error: any) {
//             logger.error(`[FigmaClient] Error triggering export for asset ${assetId}: ${error.message}`);
//             if (axios.isAxiosError(error) && error.response) {
//                 logger.error('Figma Export API Response Error:', error.response.data);
//             }
//             // We re-throw the error to ensure the main transaction is rolled back.
//             throw new Error('Failed to export asset with Figma API.');
//         }
//     }
}

export default new FigmaClient();