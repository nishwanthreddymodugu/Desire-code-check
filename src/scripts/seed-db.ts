import { sequelize } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import createLogger from '../config/logger';

const logger = createLogger(module);

const seedDatabase = async () => {
    logger.debug('--- Starting Database Seeding ---');
    try {
        logger.debug('Step 1: Reading seed.sql file...');
        const sqlFilePath = path.join(__dirname, '..', 'db', '02-seed.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        logger.debug('Step 2: Executing INSERT statements...');
        await sequelize.query(sql);
        logger.info('✅ Seed data has been successfully inserted!');
    } catch (error: any) {
        logger.error('❌ Error during database seeding:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        logger.info('Database connection closed.');
    }
};

seedDatabase();
