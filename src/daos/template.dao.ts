import { CreationAttributes, FindOptions } from 'sequelize';
import { Template } from '../models/template';
import logger from '../config/logger'; // Winston logger

class TemplateDAO {

  public async save(data: CreationAttributes<Template>): Promise<Template> {
    try {
      logger.info(`[TemplateDAO] Saving template: ${data.templateName}`);
      const [template] = await Template.upsert(data);
      logger.info(`[TemplateDAO] Template saved successfully: ${template.templateName} (ID: ${template.templateId})`);
      return template;
    } catch (error: any) {
      logger.error(`[TemplateDAO] Error saving template: ${error.message}`);
      throw error;
    }
  }

  public async list(options: FindOptions): Promise<Template[]> {
    try {
      logger.info(`[TemplateDAO] Listing templates with options: ${JSON.stringify(options)}`);
      const templates = await Template.findAll(options);
      logger.info(`[TemplateDAO] Found ${templates.length} templates`);
      return templates;
    } catch (error: any) {
      logger.error(`[TemplateDAO] Error listing templates: ${error.message}`);
      throw error;
    }
  }

  public async findById(id: number): Promise<Template | null> {
    try {
      logger.info(`[TemplateDAO] Finding template by ID: ${id}`);
      const template = await Template.findByPk(id);
      if (template) logger.info(`[TemplateDAO] Template found: ${template.templateName} (ID: ${template.templateId})`);
      else logger.warn(`[TemplateDAO] Template not found with ID: ${id}`);
      return template;
    } catch (error: any) {
      logger.error(`[TemplateDAO] Error finding template by ID: ${error.message}`);
      throw error;
    }
  }
}

export default new TemplateDAO();
