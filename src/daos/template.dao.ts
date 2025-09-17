import { CreationAttributes, FindOptions } from 'sequelize';
import { Template } from '../models/template';

class TemplateDAO {
    /**
     * Uses 'upsert' to either CREATE a new template or UPDATE an existing one.
     */
    public async save(data: CreationAttributes<Template>): Promise<Template> {
        // 'upsert' is perfect for the save/upsert pattern.
        const [template] = await Template.upsert(data);
        return template;
    }
    
    /**
     * Finds all templates matching the given criteria.
     */
    public async list(options: FindOptions): Promise<Template[]> {
        return Template.findAll(options);
    }

    /**
     * Finds a single template by its primary key.
     */
    public async findById(id: number): Promise<Template | null> {
        return Template.findByPk(id);
    }
}

export default new TemplateDAO();
