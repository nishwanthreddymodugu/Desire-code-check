import { CreationAttributes, FindOptions } from 'sequelize';
import TemplateDAO from '../daos/template.dao';
import VerticalDAO from '../daos/vertical.dao';
import { Template } from '../models/template';
import { TemplateIn, TemplateOut } from '../interfaces/template.interface';
import logger from '../config/logger'; // Winston logger

class TemplateService {
  public save(data: TemplateIn): Promise<TemplateOut> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info(`Saving template: ${data.templatename} under verticalId: ${data.verticalId}`);

        if (!data.templatename) throw new Error("templatename is required.");
        if (!data.verticalId) throw new Error("verticalId is required.");

        // 1. Check duplicates under the same vertical
        const templatesInSameVertical = await TemplateDAO.list({ where: { verticalId: data.verticalId } });
        const duplicateInSameVertical = templatesInSameVertical.find(t =>
          t.templateName.toLowerCase() === data.templatename.toLowerCase() &&
          (!data.templateId || t.templateId !== data.templateId)
        );

        if (duplicateInSameVertical) {
          const msg = "templatename already exists under this vertical, please use another name.";
          logger.error(msg);
          return reject(new Error(msg));
        }

        // 2. Check duplicates in other verticals
        const templatesWithName = await TemplateDAO.list({ where: { templateName: data.templatename } });
        const duplicateInOtherVertical = templatesWithName.find(t =>
          t.verticalId !== data.verticalId &&
          (!data.templateId || t.templateId !== data.templateId)
        );

        if (duplicateInOtherVertical) {
          const msg = "templatename already exists in a different vertical, use another name.";
          logger.error(msg);
          return reject(new Error(msg));
        }

        const parentVertical = await VerticalDAO.findById(data.verticalId);
        if (!parentVertical) {
          const msg = `Cannot save template because Vertical with ID '${data.verticalId}' does not exist.`;
          logger.error(msg);
          return reject(new Error(msg));
        }

        const dataToSave: CreationAttributes<Template> = {
          templateId: data.templateId,
          templateName: data.templatename,
          verticalId: data.verticalId,
        };

        const savedTemplate = await TemplateDAO.save(dataToSave);
        logger.info(`Template saved successfully: ${savedTemplate.templateName} (ID: ${savedTemplate.templateId})`);

        resolve({
          templateId: savedTemplate.templateId,
          templatename: savedTemplate.templateName,
          verticalId: savedTemplate.verticalId,
        });
      } catch (error: any) {
        logger.error(`Error saving template: ${error.message}`);
        reject(error);
      }
    });
  }

  public list(verticalId: number): Promise<TemplateOut[]> {
    return new Promise(async (resolve, reject) => {
      try {
        logger.info(`Fetching templates for verticalId: ${verticalId}`);

        const options: FindOptions = {
          where: { verticalId },
          order: [['templateName', 'ASC']],
        };

        const templates = await TemplateDAO.list(options);
        logger.info(`Fetched ${templates.length} templates for verticalId: ${verticalId}`);

        resolve(
          templates.map((t) => ({
            templateId: t.templateId,
            templatename: t.templateName,
            verticalId: t.verticalId,
          }))
        );
      } catch (error: any) {
        logger.error(`Error fetching templates for verticalId ${verticalId}: ${error.message}`);
        reject(error);
      }
    });
  }
}

export default new TemplateService();
