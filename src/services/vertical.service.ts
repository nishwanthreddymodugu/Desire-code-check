import { CreationAttributes } from 'sequelize';
import VerticalDAO from '../daos/vertical.dao';
import { Vertical } from '../models/vertical';
import { VerticalIn, VerticalOut } from '../interfaces/vertical.interface';
import logger from '../config/logger'; // Winston logger

class VerticalService {
  public async save(data: VerticalIn): Promise<VerticalOut> {
    try {
      logger.info(`Saving vertical: ${data.verticalname}`);

      if (!data.verticalname) {
        const msg = "Validation failed: verticalname is required.";
        logger.error(msg);
        throw new Error(msg);
      }

      const verticals = await VerticalDAO.list();
      const duplicate = verticals.find(v =>
        v.verticalName.toLowerCase() === data.verticalname.toLowerCase() &&
        (!data.verticalId || v.verticalId !== data.verticalId)
      );

      if (duplicate) {
        const msg = "verticalname already exists, please use another name.";
        logger.error(msg);
        throw new Error(msg);
      }

      const dataToSave: CreationAttributes<Vertical> = {
        verticalId: data.verticalId,
        verticalName: data.verticalname,
      };

      const savedVertical = await VerticalDAO.save(dataToSave);
      logger.info(`Vertical saved successfully: ${savedVertical.verticalName} (ID: ${savedVertical.verticalId})`);

      return {
        verticalId: savedVertical.verticalId,
        verticalname: savedVertical.verticalName,
      };
    } catch (error: any) {
      logger.error(`Error saving vertical: ${error.message}`);
      throw error;
    }
  }

  public async list(): Promise<VerticalOut[]> {
    try {
      logger.info(`Fetching all verticals`);
      const verticals = await VerticalDAO.list();

      if (!verticals || verticals.length === 0) {
        const msg = "No verticals found.";
        logger.warn(msg);
        throw new Error(msg);
      }

      logger.info(`Fetched ${verticals.length} verticals`);
      return verticals.map(v => ({
        verticalId: v.verticalId,
        verticalname: v.verticalName,
      }));
    } catch (error: any) {
      logger.error(`Error fetching verticals: ${error.message}`);
      throw error;
    }
  }
}

export default new VerticalService();