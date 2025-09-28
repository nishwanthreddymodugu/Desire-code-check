import { sequelize } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import createLogger from '../config/logger';

const logger = createLogger(module);

const resetDatabase = async () => {
    logger.debug('--- Starting Database Reset ---');
    try {
        logger.debug('Step 1: Reading schema.sql file...');
        const sqlFilePath = path.join(__dirname, '..', 'db', '01-schema.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        logger.debug('Step 2: Executing DROP and CREATE TABLE statements...');
        await sequelize.query(sql);
        logger.info('✅ Database schema has been successfully reset!');
    } catch (error: any) {
        logger.error('❌ Error during database reset:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        logger.info('Database connection closed.');
    }
};

resetDatabase();
