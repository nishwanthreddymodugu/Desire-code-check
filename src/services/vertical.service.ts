import { CreationAttributes } from 'sequelize';
import VerticalDAO from '../daos/vertical.dao';
import { Vertical } from '../models/vertical';
import { VerticalIn, VerticalOut } from '../interfaces/vertical.interface';

class VerticalService {
  public async save(data: VerticalIn): Promise<VerticalOut> {
    if (!data.verticalname) {
      throw new Error("Validation failed: verticalname is required.");
    }

    const verticals = await VerticalDAO.list();
    const duplicate = verticals.find(v =>
      v.verticalName.toLowerCase() === data.verticalname.toLowerCase() &&
      (!data.verticalId || v.verticalId !== data.verticalId)
    );
    if (duplicate) {
      throw new Error("verticalname already exists, please use another name.");
    }

    const dataToSave: CreationAttributes<Vertical> = {
      verticalId: data.verticalId,
      verticalName: data.verticalname,
    };

    const savedVertical = await VerticalDAO.save(dataToSave);

    return {
      verticalId: savedVertical.verticalId,
      verticalname: savedVertical.verticalName,
    };
  }

  public async list(): Promise<VerticalOut[]> {
    const verticals = await VerticalDAO.list();

    if (!verticals || verticals.length === 0) {
      throw new Error("No verticals found.");
    }

    return verticals.map(v => ({
      verticalId: v.verticalId,
      verticalname: v.verticalName,
    }));
  }
}

export default new VerticalService();
