import { CreationAttributes } from 'sequelize';
import { Vertical } from '../models/vertical';

class VerticalDAO {
    public async save(data: CreationAttributes<Vertical>): Promise<Vertical> {
        const [vertical] = await Vertical.upsert(data);
        return vertical;
    }
    
    public async list(): Promise<Vertical[]> {
        return Vertical.findAll({ order: [['verticalName', 'ASC']] });
    }

    public async findById(id: number): Promise<Vertical | null> {
        return Vertical.findByPk(id);
    }
}
export default new VerticalDAO();