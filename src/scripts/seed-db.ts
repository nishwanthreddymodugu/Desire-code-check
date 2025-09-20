import { sequelize } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../config/logger'; // Winston logger

const seedDatabase = async () => {
    logger.info('--- Starting Database Seeding ---');
    try {
        logger.info('Step 1: Reading seed.sql file...');
        const sqlFilePath = path.join(__dirname, '..', 'db', '02-seed.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        logger.info('Step 2: Executing INSERT statements...');
        await sequelize.query(sql);

        logger.info('✅ Seed data has been successfully inserted!');
    } catch (error: any) {
        logger.error(`❌ Error during database seeding: ${error.message}`);
        process.exit(1);
    } finally {
        await sequelize.close();
        logger.info('Database connection closed.');
    }
};

seedDatabase();
