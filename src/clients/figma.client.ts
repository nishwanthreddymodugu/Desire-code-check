import axios from 'axios';
import createLogger from '../config/logger';

import * as dotenv from 'dotenv';

dotenv.config();
const logger = createLogger(module);

const FIGMA_API_URL = process.env.FIGMA_API_URL;

if (!FIGMA_API_URL) {
    throw new Error("CRITICAL ERROR: FIGMA_API_URL is not defined in the .env file.");
}

class FigmaClient {
    /**
     * Sends an original Figma ID to the service to be cloned.
     * @param originalFigmaId The ID of the master Figma file (e.g., "t85p6LbZ4l0Yx7tcsQBsEi").
     * @returns An object containing the ID of the newly cloned file.
     */
    public async cloneFile(originalFigmaId: string): Promise<{ clonedFileId: string }> {
        const endpoint = `${FIGMA_API_URL}/api/v1/figma/project/clone`; 
        logger.debug(`[FigmaClient] Sending request to clone Figma ID: ${originalFigmaId}`);

        try {
            const response = await axios.post(
                endpoint,
                { projectId: originalFigmaId },
                {
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            logger.info(`[FigmaClient] Received successful clone response for ${originalFigmaId}.`);
            
            const clonedFileId = response.data.cloneFileId;
            if (!clonedFileId) {
                throw new Error("Figma API response did not contain a 'cloneFileId'.");
            }
            return { clonedFileId: clonedFileId };

        } catch (error: any) {
            logger.error(`[FigmaClient] Error calling Figma clone API for ID ${originalFigmaId}: ${error.message}`);
            if (axios.isAxiosError(error) && error.response) {
                logger.error('Figma API Response Error Body:', error.response.data);
            }
            throw new Error('Failed to clone asset with Figma API.');
        }
    }
}

export default new FigmaClient();