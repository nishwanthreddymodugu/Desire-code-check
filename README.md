Desire AI - Backend Service
# Desire AI Backend Service

Welcome to the **Desire AI Backend Service** repository! This project powers the backend for the Desire AI platform, a cutting-edge solution tailored for the marketing campaign industry. Built with modern technologies, it ensures scalability, security, and performance.



🛠️ Tech Stack

•	Runtime: Node.js
•	Framework: Express.js
•	Language: TypeScript
•	ORM: Sequelize (with sequelize-typescript)
•	Database: PostgreSQL 
•	Dotenv for environment config

•	Nodemon for development



 🏗️ Project Structure Overview

The project is designed with a clear and modular architecture:
desire-ai-backend/
├── dist/ # Compiled JavaScript files
├──src/config/database #actually creates and exports the Sequelize instance using your .env configuration.
├──src/interfaces/ # TypeScript interfaces
├── src/models/ # Sequelize models
├── src/daos/ # Data Access Objects for DB queries
├── src/middleware/ # Express middleware (auth, etc.)…remove not required for now
├── schema.sql # Database schema
├── .env # Environment variables
├── package.json # Dependencies and scripts
├── tsconfig.json # TypeScript configuration


🛠️ Getting Started: Local Setup

Follow these steps to set up the project on your local machine:

1️⃣ Clone the Repository
```bash
git clone <your-repository-url>
cd desire-ai-backend
```

2️⃣ Install Dependencies
Install all required packages:
```bash
npm install
```

3️⃣ Configure Environment
Create a .env file in the root directory:
PORT=as mentioned in you project
DB_URL=postgres://username:password@localhost:PORT/yourdb
.  

4️⃣ Database Synchronization
This project uses Sequelize's `sync` method for development. The database schema automatically adjusts to match the latest code in `src/models/`:

 The command `await sequelize.sync({ alter: true });` in `src/server.ts` ensures safe synchronization without data loss.

5️⃣ Start the Server
•	Production: npm run build
•	Development: npm run dev

Output should be:

12:18:04 pm - Found 0 errors. Watching for file changes.
[1] ✅ Database connection established.
[1] check---- synchronized.
[1] 🚀 Server running on http://localhost:3001

After getting this, we need to run the block of code that is script of sql in `schema.sql` file that contains:
Table creation scripts (`verticals`, `templates`, `assets`, `campaigns`, `campaignassets`)
Foreign key relationships
Initial seed data for verticals, templates, assets, campaigns, and campaignassets

This will do:
1.	Drop existing tables if they exist.
2.	Create fresh tables with all constraints.
3.	Insert sample rows into verticals, templates, assets, campaigns, and campaignassets.

NOTE: Before this you need to setup the postgres locally in your laptops.
The URL in .env should match with the all properties  connections of postgres.

