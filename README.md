Desire AI - Backend Service

# Desire AI Backend Service

Welcome to the Desire AI Backend Service repository! This project powers the backend for the Desire AI platform, a cutting-edge tool for the marketing campaign industry.

---

## 🛠️ Tech Stack

-   **Runtime**: Node.js (LTS Version Recommended)
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **ORM**: Sequelize with sequelize-typescript
-   **Database**: PostgreSQL

---

## 🏗️ Project Structure Overview

The project follows a professional 4-tier architecture designed for clarity, scalability, and separation of concerns:

-   **`src/routes/`**: The "web layer." Handles raw HTTP requests and responses. Validates incoming data before passing it to the service layer.
-   **`src/services/`**: The "business logic layer." Contains the core application logic, independent of the web, and orchestrates calls to the DAO.
-   **`src/daos/`**: The "data access layer." Manages all direct database operations for specific models.
-   **`src/interfaces/`**: Defines the data contracts (*In and *Out interfaces) for communication between the routes and services.
-   **`src/models/`**: Contains all Sequelize model definitions, which act as the blueprint for our database tables.
-   **`src/db/`**: Contains the raw `.sql` files used to reset the database schema and seed it with initial data.
-   **`src/scripts/`**: Contains Node.js scripts (e.g., `reset-db.ts` and `seed-db.ts`) that execute the SQL files.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your local machine:

1. **Node.js**: The latest LTS version is recommended. [Download here](https://nodejs.org).
2. **PostgreSQL**: A local PostgreSQL server instance. Use [Postgres.app](https://postgresapp.com) (for Mac) or follow the [official download instructions](https://www.postgresql.org/download/) for your OS.

---

## 🚀 Getting Started: Local Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd desire-ai-backend
```

### 2. Install Dependencies

Install all the necessary packages defined in `package.json`:

```bash
npm install
```

### 3. Configure Environment Variables

The `.env` file stores your secret keys and database connection string.

#### a. Create the file:

```bash
cp .env.example .env
```

#### b. Edit the file:

Open the new `.env` file and set the `DB_URL`. For a standard local PostgreSQL installation, your URL will look like this (replace `your_password` and `your_database_name` with your credentials):

```env
# .env file example
PORT=8080
DB_URL="postgresql://postgres:your_password@localhost:5432/your_database_name"

# AWS Configuration for LocalStack
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_SQS_ENDPOINT=http://localhost:4566
AWS_S3_ENDPOINT=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true

# S3 and SQS Configuration
IMAGE_BUCKET=local-desire-image-assets
IMAGE_GEN_QUEUE=local-desire-image-request-queue
```
## LocalStack S3 Setup
Install the following:

Node.js LTS (18+ recommended) and npm
Docker Desktop (to run LocalStack desktop)
AWS CLI v2 (for real AWS accounts)

Once the basics are installed, add the helper CLIs that the project scripts rely on:
```bash
npm install --global aws-cdk aws-cdk-local
pip install awscli-local
```

### 1. Start LocalStack with Docker Compose

Created a docker-compose.yml 

Run the following command:
```bash
docker compose up
```

### 2. Create an S3 Bucket

Once LocalStack is running, create your bucket (e.g., local-desire-image-assets):
```bash
awslocal s3api list-objects --bucket local-desire-image-assets
```

You can now use Postman to upload images to your S3 bucket in LocalStack.

## 🛠️ Database Setup (Crucial Step)

This project uses SQL scripts to manage the database schema and seed data. Run these commands in the correct order:

### 1. Reset the Database Schema

This command connects to your local database, drops all existing project tables (if they exist), and recreates them from scratch based on `src/db/01-schema.sql`:

```bash
npm run db:reset
```

### 2. Seed the Database with Dummy Data

After the tables are created, populate your database with sample data using:

```bash
npm run db:seed
```

Your database is now fully set up and ready for development.

---

## ▶️ Running the Application

Start the server using `nodemon`, which automatically restarts when you save a file:

```bash
npm run dev
```

You should see the following output in your terminal, confirming that everything is working:

```
✅ Database connection established.
🚀 Server running on http://localhost:8080
```

## 📝 Logging

This project uses Winston with log rotation to handle application logs.

After installing project dependencies, run:

```bash
npm install winston winston-daily-rotate-file
```

Added daily rotating file transport with hourly rotation (YYYY-MM-DD-HH) and 7-day retention.
Integrated logger in services, routes, DAOs, scripts, main server, and database for consistent logging.

Example Log Output

```
[2025-09-23 12:54:31] [server.ts] INFO: 🚀 Server running on http://localhost:8080
[2025-09-23 12:54:53] [asset.service.ts] INFO: Returned 2 assets for templateId: 2
```

Log File Location: logs/app-YYYY-MM-DD-HH.log

Make sure the logs/ folder exists, or Winston will create it automatically.
