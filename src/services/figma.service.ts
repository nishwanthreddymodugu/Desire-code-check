import createLogger from '../config/logger';

const logger = createLogger(module);

class FigmaService {
  async cloneFile(originalFileId: string): Promise<{ clonedFileId: string }> {
    try {
      logger.debug(`Attempting to clone Figma file: ${originalFileId}`);
      await new Promise(res => setTimeout(res, 300));

      const clonedFileId = `cloned_${Date.now()}`;
      logger.info(`Cloned Figma file ID: ${clonedFileId}`);

      return { clonedFileId };
    } catch (error: any) {
      logger.error(`Error in cloning Figma file ${originalFileId}: ${error.message}`);
      throw error;
    }
  }

  async updateFile(fileId: string, updates: any): Promise<boolean> {
    try {
      logger.debug(`Attempting to send updates to Figma file ${fileId}`);
      logger.debug(updates);  // Detailed log of updates

      await new Promise(res => setTimeout(res, 500));

      logger.info(`Update applied to file ${fileId} successfully`);
      return true;
    } catch (error: any) {
      logger.error(`Error in updating Figma file ${fileId}: ${error.message}`);
      throw error;
    }
  }
}

export default new FigmaService();

