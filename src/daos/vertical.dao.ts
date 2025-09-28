import { CreationAttributes } from 'sequelize';
import { Vertical } from '../models/vertical';
import createLogger from '../config/logger';
const logger = createLogger(module);

class VerticalDAO {
    public async save(data: CreationAttributes<Vertical>): Promise<Vertical> {
        try {
            const [vertical] = await Vertical.upsert(data);
            return vertical;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }
    
    public async list(): Promise<Vertical[]> {
        try {
            const verticals = await Vertical.findAll({ order: [['verticalName', 'ASC']] });
            return verticals;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }

    public async findById(id: number): Promise<Vertical | null> {
        try {
            const vertical = await Vertical.findByPk(id);
            return vertical;
        } catch (error) {
            logger.error(`${id}: ${(error as Error).message}`);
            throw error;
        }
    }
}

export default new VerticalDAO();

