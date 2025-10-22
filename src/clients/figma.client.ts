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
     * Sends an original Figma ID and its parent campaign/asset IDs to the service to be cloned.
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
            
        const uploadError = response.data?.UploadDetails?.Error; // Checks for 'UploadDetails' (uppercase U)
            const uploadError2 = response.data?.uploadDetails?.Error; // Checks for 'uploadDetails' (lowercase u)
            const clonedError = response.data?.clonedDetails?.Error; // Checks for error in 'clonedDetails'
            
            if (uploadError || uploadError2 || clonedError) {
                const errorMessage = uploadError || uploadError2 || clonedError;
                logger.error(`[FigmaClient] Flask server returned a 200 OK but contained an internal error:`, { error: errorMessage });
                throw new Error(`The Figma service failed during its internal process: ${errorMessage}`);
            }

            const clonedFileId = response.data?.clonedDetails?.cloneFileId;
            if (!clonedFileId) {
                throw new Error("Figma API response was successful but did not contain the expected 'clonedDetails.cloneFileId' property.");
            }
            
            return { clonedFileId: clonedFileId };
            // ----------------------------------------------------

        } catch (error: unknown) { // Use 'unknown' for type safety
            
            if (axios.isAxiosError(error)) {
                logger.error('[FigmaClient] Axios error calling Figma clone API:', { 
                    message: error.message,
                    responseData: error.response?.data 
                });
            } else if (error instanceof Error) {
                logger.error('[FigmaClient] Generic error calling Figma clone API:', { stack: error.stack });
            } else {
                logger.error('[FigmaClient] Unknown error calling Figma clone API:', { error });
            }
            
            throw new Error('Failed to clone asset with Figma API.');
        }
    }
}

export default new FigmaClient();