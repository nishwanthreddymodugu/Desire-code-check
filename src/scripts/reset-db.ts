import { sequelize } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../config/logger'; // Winston logger

const resetDatabase = async () => {
    logger.info('--- Starting Database Reset ---');
    try {
        logger.info('Step 1: Reading schema.sql file...');
        const sqlFilePath = path.join(__dirname, '..', 'db', '01-schema.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        logger.info('Step 2: Executing DROP and CREATE TABLE statements...');
        await sequelize.query(sql);

        logger.info('✅ Database schema has been successfully reset!');
    } catch (error: any) {
        logger.error(`❌ Error during database reset: ${error.message}`);
        process.exit(1);
    } finally {
        await sequelize.close();
        logger.info('Database connection closed.');
    }
};

resetDatabase();
