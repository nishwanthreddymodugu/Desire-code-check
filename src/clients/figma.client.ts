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
            const uploadDetailsError = response.data?.UploadDetails?.Error;
            if(uploadDetailsError){
                logger.error(`[FigmaClient] Upload details indicate an error:`, uploadDetailsError);
            }
            console.log('Clone response data:', response.data);
            const uploadError = response.data?.UploadDetails?.Error;
            console.log('Upload error from response:', uploadError);
            if (uploadError) {
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
}

export default new FigmaClient();