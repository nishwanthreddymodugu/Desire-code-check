import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { Vertical } from '../models/vertical';
import { Template } from '../models/template';
import { Asset } from '../models/asset';
import { Campaign } from '../models/campaign';
import { CampaignAsset } from '../models/campaignasset';
import createLogger from '../config/logger';

dotenv.config();

const logger = createLogger(module);

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
    logger.error("DB_URL environment variable is not defined or is empty.");
    throw new Error("DB_URL environment variable is not defined or is empty.");
}
const sequelizeOptions: SequelizeOptions = {
    dialect: 'postgres',
    logging: false,
    models: [Vertical, Template, Asset, Campaign, CampaignAsset],
    // dialectOptions: {
    //     ssl: {
    //         require: true,
    //         rejectUnauthorized: false, // This is mandatory for NeonDB
    //     },
    // },
};


export const sequelize = new Sequelize(dbUrl, sequelizeOptions);
logger.info('Sequelize instance created successfully and models registered.');