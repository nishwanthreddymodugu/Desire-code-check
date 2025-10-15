import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';
import createLogger from './logger'; 
const logger = createLogger(module);
dotenv.config();

const elasticsearchUrl = process.env.ELASTICSEARCH_URL;

if (!elasticsearchUrl) {
    throw new Error("CRITICAL ERROR: ELASTICSEARCH_URL is not defined in the .env file.");
}

logger.info(`Connecting to Elasticsearch at ${elasticsearchUrl}`);
export const esClient = new Client({ node: elasticsearchUrl });

