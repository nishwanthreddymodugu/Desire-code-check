import { CreationAttributes } from 'sequelize';
import { Vertical } from '../models/vertical';
import logger from '../config/logger'; // Winston logger

class VerticalDAO {

  public async save(data: CreationAttributes<Vertical>): Promise<Vertical> {
    try {
      logger.info(`[VerticalDAO] Saving vertical: ${data.verticalName}`);
      const [vertical] = await Vertical.upsert(data);
      logger.info(`[VerticalDAO] Vertical saved successfully: ${vertical.verticalName} (ID: ${vertical.verticalId})`);
      return vertical;
    } catch (error: any) {
      logger.error(`[VerticalDAO] Error saving vertical: ${error.message}`);
      throw error;
    }
  }

  public async list(): Promise<Vertical[]> {
    try {
      logger.info(`[VerticalDAO] Listing all verticals`);
      const verticals = await Vertical.findAll({ order: [['verticalName', 'ASC']] });
      logger.info(`[VerticalDAO] Found ${verticals.length} verticals`);
      return verticals;
    } catch (error: any) {
      logger.error(`[VerticalDAO] Error listing verticals: ${error.message}`);
      throw error;
    }
  }

  public async findById(id: number): Promise<Vertical | null> {
    try {
      logger.info(`[VerticalDAO] Finding vertical by ID: ${id}`);
      const vertical = await Vertical.findByPk(id);
      if (vertical) logger.info(`[VerticalDAO] Vertical found: ${vertical.verticalName} (ID: ${vertical.verticalId})`);
      else logger.warn(`[VerticalDAO] Vertical not found with ID: ${id}`);
      return vertical;
    } catch (error: any) {
      logger.error(`[VerticalDAO] Error finding vertical by ID: ${error.message}`);
      throw error;
    }
  }
}

export default new VerticalDAO();
