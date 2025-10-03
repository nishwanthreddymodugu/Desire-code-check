import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { Vertical } from '../models/vertical';
import { Template } from '../models/template';
import { Asset } from '../models/asset';
import { Campaign } from '../models/campaign';
import { CampaignAsset } from '../models/campaignasset';
import createLogger from '../config/logger';
import { User } from '../models/user';



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
    // register all models here (User was imported but not registered)
    models: [Vertical, Template, Asset, Campaign, CampaignAsset, User],
    // dialectOptions: {
    //     ssl: {
    //         require: true,
    //         rejectUnauthorized: false, // This is mandatory for NeonDB
    //     },
    // },


};


let _sequelize: Sequelize;
try {
    _sequelize = new Sequelize(dbUrl, sequelizeOptions);
    logger.info('Sequelize instance created successfully and models registered.');
} catch (err: any) {
    // Log full stack to help debug initialization errors (shows up in logs)
    logger.error(`Failed to initialize Sequelize: ${err && (err.stack || err.message)}`);
    throw err;
}

export const sequelize = _sequelize;