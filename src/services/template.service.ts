import { CreationAttributes, FindOptions } from 'sequelize';
import TemplateDAO from '../daos/template.dao';
import VerticalDAO from '../daos/vertical.dao';
import { Template } from '../models/template';
import { TemplateIn, TemplateOut } from '../interfaces/template.interface';

class TemplateService {
  public save(data: TemplateIn): Promise<TemplateOut> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.templatename) {
        throw new Error("templatename is required.");
      }
      if (!data.verticalId) {
        throw new Error("verticalId is required.");
      }

      // 1. Check duplicates under the same vertical
      const templatesInSameVertical = await TemplateDAO.list({ where: { verticalId: data.verticalId } });
      const duplicateInSameVertical = templatesInSameVertical.find(t =>
        t.templateName.toLowerCase() === data.templatename.toLowerCase() &&
        (!data.templateId || t.templateId !== data.templateId)
      );

      if (duplicateInSameVertical) {
        return reject(new Error("templatename already exists under this vertical, please use another name."));
      }

      // 2. Check duplicates in other verticals (different verticalId)
      const templatesWithName = await TemplateDAO.list({ where: { templateName: data.templatename } });
      const duplicateInOtherVertical = templatesWithName.find(t =>
        t.verticalId !== data.verticalId &&
        (!data.templateId || t.templateId !== data.templateId)
      );

      if (duplicateInOtherVertical) {
        return reject(new Error("templatename already exists in a different vertical,use another name"));
      }

      const parentVertical = await VerticalDAO.findById(data.verticalId);
      if (!parentVertical) {
        return reject(new Error(`Cannot save template because Vertical with ID '${data.verticalId}' does not exist.`));
      }

      const dataToSave: CreationAttributes<Template> = {
        templateId: data.templateId,
        templateName: data.templatename,
        verticalId: data.verticalId,
      };

      const savedTemplate = await TemplateDAO.save(dataToSave);

      resolve({
        templateId: savedTemplate.templateId,
        templatename: savedTemplate.templateName,
        verticalId: savedTemplate.verticalId,
      });
    } catch (error) {
      reject(error);
    }
  });
}

  public list(verticalId: number): Promise<TemplateOut[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const options: FindOptions = {
          where: { verticalId },
          order: [['templateName', 'ASC']],
        };

        const templates = await TemplateDAO.list(options);
        resolve(
          templates.map((t) => ({
            templateId: t.templateId,
            templatename: t.templateName,
            verticalId: t.verticalId,
          }))
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new TemplateService();
