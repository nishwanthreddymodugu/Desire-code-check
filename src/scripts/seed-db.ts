import { sequelize } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const seedDatabase = async () => {
    console.log('--- Starting Database Seeding ---');
    try {
        console.log('Step 1: Reading seed.sql file...');
        const sqlFilePath = path.join(__dirname, '..', 'db', '02-seed.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        console.log('Step 2: Executing INSERT statements...');
        await sequelize.query(sql);
        console.log('✅ Seed data has been successfully inserted!');

    } catch (error) {
        console.error('❌ Error during database seeding:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('Database connection closed.');
    }
};

seedDatabase();
