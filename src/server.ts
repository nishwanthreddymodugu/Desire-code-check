import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { sequelize } from "./config/database";
import apiRoutes from "./routes";
import createLogger from "./config/logger";

const logger = createLogger(module); // pass module to show filename in logs

const app: Application = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to log each request
app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
});

// All routes managed from single imported router
app.use("/api/v1", apiRoutes);

app.get("/ping", (_req: Request, res: Response) => {
    res.send("pong");
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`${err.message} | Stack: ${err.stack}`);
    res.status(500).json({
        message: "An internal server error occurred",
        error: err.message,
    });
});

const startServer = async () => {
    try {
        await sequelize.authenticate();
        logger.info("✅ Database connection established.");

        // Sync DB
        await sequelize.sync({ alter: true });
        logger.info("✅ Database synchronized.");

        // Start server
        app.listen(PORT, () =>
            logger.info(`🚀 Server running on http://localhost:${PORT}`)
        );
    } catch (error: any) {
        logger.error(`❌ Unable to start server: ${error.message}`);
        process.exit(1);
    }
};

startServer();
