import { CreationAttributes, FindOptions } from 'sequelize';
import { Asset } from '../models/asset';

class AssetDAO {
    
    public async save(data: CreationAttributes<Asset>): Promise<Asset> {
        const [asset] = await Asset.upsert(data);
        return asset;
    }
    
    public async list(options: FindOptions): Promise<Asset[]> {
        return Asset.findAll(options);
    }

    public async findById(id: number): Promise<Asset | null> {
        return Asset.findByPk(id);
    }
}

export default new AssetDAO();
