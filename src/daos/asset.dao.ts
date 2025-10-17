import { CreationAttributes, FindOptions } from 'sequelize';
import { Asset } from '../models/asset';
import createLogger from '../config/logger';  
const logger = createLogger(module);

class AssetDAO {
    
    public async save(data: CreationAttributes<Asset>): Promise<Asset> {
        try {
            const [asset] = await Asset.upsert(data);
            return asset;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }
    
    public async list(options: FindOptions): Promise<Asset[]> {
        try {
            const assets = await Asset.findAll(options);
            return assets;
        } catch (error) {
            logger.error(`${(error as Error).message}`);
            throw error;
        }
    }

    public async findById(id: number): Promise<Asset | null> {
        try {
            const asset = await Asset.findByPk(id);
            return asset;
        } catch (error) {
            logger.error(`${id}: ${(error as Error).message}`);
            throw error;
        }
    }

    public async findByName(name: string): Promise<Asset | null> {
        try {
            const asset = await Asset.findOne({ where: { assetName: name } });
            return asset;
        } catch (error) {
            logger.error(`${name}: ${(error as Error).message}`);
            throw error;
        }
    }
}

export default new AssetDAO();
