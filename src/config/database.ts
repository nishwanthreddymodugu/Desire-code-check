import { Sequelize, SequelizeOptions } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { Vertical } from '../models/vertical';
import { Template } from '../models/template';
import { Asset } from '../models/asset';
import { Campaign } from '../models/campaign';
import { CampaignAsset } from '../models/campaignasset';
import { User } from '../models/user';
import logger from './logger'; // Winston logger

dotenv.config();

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  throw new Error("DB_URL environment variable is not defined or is empty.");
}
const LOGGING_ENABLED = false; // Set true to turn on logs
const sequelizeOptions: SequelizeOptions = {
  dialect: 'postgres',
  
  logging: LOGGING_ENABLED ? (msg) => logger.info(`[Sequelize] ${msg}`) : false, 
  models: [Vertical, Template, Asset, Campaign, CampaignAsset, User],
  // dialectOptions: {
  //   ssl: {
  //     require: true,
  //     rejectUnauthorized: false, // Mandatory for NeonDB
  //   },
  // },
};

export const sequelize = new Sequelize(dbUrl, sequelizeOptions);