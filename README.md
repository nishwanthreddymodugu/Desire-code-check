Desire AI - Backend Service
# Desire AI Backend Service

Welcome to the Desire AI Backend Service repository! This project powers the backend for the Desire AI platform, a cutting-edge tool designed to revolutionize the marketing campaign industry.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (LTS Version Recommended)
- **Framework**: Express.js
- **Language**: TypeScript
- **Primary Database**: PostgreSQL
- **Search Engine**: Elasticsearch
- **ORM**: Sequelize with sequelize-typescript
- **Containerization**: Docker with Docker Compose
- **Authentication**: JSON Web Tokens (JWT)

---

## 🏗️ Project Structure Overview

The project follows a professional 4-tier architecture for clarity, scalability, and separation of concerns:

- `src/routes/`: The "web layer" that handles raw HTTP requests and responses.
- `src/services/`: The "business logic layer" containing core application logic.
- `src/daos/`: The "data access layer" for the PostgreSQL database.
- `src/clients/`: Clients for connecting to external services like Elasticsearch.
- `src/interfaces/`: Data contracts for communication between layers.
- `src/models/`: Sequelize model definitions, the blueprint for PostgreSQL tables.
- `src/db/`: Raw `.sql` files for resetting and seeding the database.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your local machine:

1. **Node.js**: The latest LTS version is recommended. [Download here](https://nodejs.org/).
2. **Docker Desktop**: Required to run local PostgreSQL and Elasticsearch containers. [Download here](https://www.docker.com/products/docker-desktop). Ensure Docker Desktop is running before proceeding.

---

## 🚀 Getting Started: Local Setup

This project uses Docker Compose to manage all local development services.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd desire-ai-backend
```

### 2. Install Dependencies

Install the Node.js packages for the application:

```bash
npm install
```

### 3. Configure Environment Variables

The `.env` file stores all your local secrets and connection strings.

1. Create the file:

    ```bash
    cp .env.example .env
    ```

2. Verify the contents: Open the new `.env` file. For local Docker-based development, the default values are pre-configured:

    ```env
    NODE_ENV=development
    PORT=8080
    DB_URL="postgresql://desire_user:desire_password@localhost:5432/desire_db"
    ELASTICSEARCH_URL="http://localhost:9200"
    ```

---

## 🐳 Running the Local Environment

The entire local environment is managed through Docker and npm scripts.

### 1. Start the Docker Services (PostgreSQL & Elasticsearch)

Run the following command to start the services:

```bash
docker-compose up -d
```

To verify the services are running:

- Open the Docker Desktop application. You should see two containers running: `desire_ai_db` and `desire_ai_search`.
- Alternatively, run `docker ps` in your terminal to see the running containers.

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

Start the Node.js server:

```bash
npm run dev
```

You should see the following output:

```plaintext
✅ Database connection established.
🚀 Server running on http://localhost:8080
```

---