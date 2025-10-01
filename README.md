# Desire AI Backend Service

Welcome to the Desire AI Backend Service repository! This project powers the backend for the Desire AI platform, a cutting-edge tool designed to revolutionize the marketing campaign industry.

## 🛠️ Tech Stack

-   **Runtime**: Node.js (LTS Version Recommended)
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Primary Database**: PostgreSQL
-   **Search Engine**: Elasticsearch
-   **ORM**: Sequelize with sequelize-typescript
-   **Containerization**: Docker with Docker Compose
-   **Authentication**: JSON Web Tokens (JWT)

## 🏗️ Project Structure Overview

The project follows a professional 4-tier architecture designed for clarity, scalability, and separation of concerns:

-   **`src/routes/`**: The "web layer." Handles raw HTTP requests and responses. Validates incoming data before passing it to the service layer.
-   **`src/services/`**: The "business logic layer." Contains the core application logic, independent of the web, and orchestrates calls to the DAO.
-   **`src/daos/`**: The "data access layer." Manages all direct database operations for specific models.
-   **`src/interfaces/`**: Defines the data contracts (*In and *Out interfaces) for communication between the routes and services.
-   **`src/clients/`**: Clients for connecting to external services like Elasticsearch.
-   **`src/models/`**: Contains all Sequelize model definitions, which act as the blueprint for our database tables.
-   **`src/db/`**: Contains the raw `.sql` files used to reset the database schema and seed it with initial data.
-   **`src/scripts/`**: Contains Node.js scripts (e.g., `reset-db.ts` and `seed-db.ts`) that execute the SQL files.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your local machine:

1. **Node.js**: The latest LTS version is recommended. [Download here](https://nodejs.org/).
2. **Docker Desktop**: Required to run local PostgreSQL and Elasticsearch containers. [Download here](https://www.docker.com/products/docker-desktop). Ensure Docker Desktop is running before proceeding.

## 🚀 Getting Started: Local Setup

This project uses Docker Compose to manage all local development services.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd desire-ai-backend
```

### 2. Install Dependencies

Install the Node.js packages for the application:

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
ELASTICSEARCH_URL="http://localhost:9200"

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

## 🐳 Running the Local Environment

The entire local environment is managed through Docker and npm scripts.

### 1. Start the Docker Services (PostgreSQL & Elasticsearch)

Run the following command to start the services:

```bash
docker-compose up -d
```

## 🛠️ Database Setup (Crucial Step)

This project uses SQL scripts to manage the database schema and seed data. Run these commands in the correct order:

### 1. Reset the Database Schema

This command connects to your local database, drops all existing project tables (if they exist), and recreates them from scratch based on `src/db/01-schema.sql`:

```bash
docker-compose up -d
```

### 2. Seed the Database with Dummy Data

After the tables are created, populate your database with sample data using:

```bash
npm run db:seed
```

Your database is now fully set up and ready for development.

### 2. Set Up the Database

With the database container running, create the tables and populate them with data:

1. **Reset the Schema**: This command runs the `01-schema.sql` file:

    ```bash
    npm run db:reset
    ```

2. **Seed the Data**: This command runs the `02-seed.sql` file:

    ```bash
    npm run db:seed
    ```

### 3. Set Up the Search Index

Create the Elasticsearch index and populate it with data:

1. **Create the Index**: Test this endpoint via Postman:

    ```http
    POST http://localhost:8080/api/v1/search/campaign/index/create
    ```

2. **Index the Data**: Write a script to read from the PostgreSQL `campaigns` table and send each record to the `POST /api/v1/search/campaign/add` endpoint.

---

## 🚀 Running the Application

# Start the Node.js server:

## ▶️ Running the Application

Start the server using `nodemon`, which automatically restarts when you save a file:

```bash
npm run dev
```

You should see the following output:

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
