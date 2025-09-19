import { sequelize } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const resetDatabase = async () => {
    console.log('--- Starting Database Reset ---');
    try {
        console.log('Step 1: Reading schema.sql file...');
        const sqlFilePath = path.join(__dirname, '..', 'db', '01-schema.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf-8');

        console.log('Step 2: Executing DROP and CREATE TABLE statements...');
        await sequelize.query(sql);
        console.log('✅ Database schema has been successfully reset!');

    } catch (error) {
        console.error('❌ Error during database reset:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
        console.log('Database connection closed.');
    }
};

resetDatabase();
