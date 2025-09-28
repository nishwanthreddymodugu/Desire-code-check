import { CreationAttributes, FindOptions } from 'sequelize';
import { Template } from '../models/template';
import createLogger from '../config/logger';
const logger = createLogger(module);

class TemplateDAO {
    /**
     * Uses 'upsert' to either CREATE a new template or UPDATE an existing one.
     */
    public async save(data: CreationAttributes<Template>): Promise<Template> {
        try {
            const [template] = await Template.upsert(data);
            return template;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }
    
    /**
     * Finds all templates matching the given criteria.
     */
    public async list(options: FindOptions): Promise<Template[]> {
        try {
            const templates = await Template.findAll(options);
            return templates;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }

    /**
     * Finds a single template by its primary key.
     */
    public async findById(id: number): Promise<Template | null> {
        try {
            const template = await Template.findByPk(id);
            return template;
        } catch (error) {
            logger.error(`${id}: ${(error as Error).message}`);
            throw error;
        }
    }
}

export default new TemplateDAO();
