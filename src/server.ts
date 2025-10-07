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

// JSON parse error handler: body-parser throws a SyntaxError when JSON is invalid.
// Provide a friendly JSON response instead of the default HTML error page.
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err && err instanceof SyntaxError && 'body' in err) {
        logger.error(`JSON parse error: ${err.message}`);
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    next(err);
});

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

// Diagnostic endpoint: list all registered routes (helps debug 404s)
const listRegisteredRoutes = () => {
    const routes: { method: string; path: string }[] = [];
    const stack = (app as any)._router.stack || [];

    stack.forEach((layer: any) => {
        // direct route
        if (layer.route && layer.route.path) {
            const methods = Object.keys(layer.route.methods).map((m: string) => m.toUpperCase()).join(',');
            routes.push({ method: methods, path: layer.route.path });
            return;
        }

        // nested router: try to extract mount path from layer.regexp
        if (layer.name === 'router' && layer.handle && layer.handle.stack) {
            // derive mount path from regexp if possible
            let mountPath = '';
            try {
                if (layer.regexp) {
                    try {
                        const s = layer.regexp.toString(); // e.g. '/^\\/api\\/v1\\/?(?=\\/|$)/i'
                        const mm = s.match(/\^\\\/(.*?)\\\\\/?/);
                        if (mm && mm[1]) {
                            mountPath = '/' + mm[1].replace(/\\\\/g, '/');
                        }
                    } catch (e) {
                        mountPath = '';
                    }
                }
            } catch (e) {
                mountPath = '';
            }

            layer.handle.stack.forEach((r: any) => {
                if (r.route && r.route.path) {
                    const methods = Object.keys(r.route.methods).map((m: string) => m.toUpperCase()).join(',');
                    const fullPath = (mountPath ? mountPath : '') + r.route.path;
                    routes.push({ method: methods, path: fullPath });
                }
            });
        }
    });

    // de-duplicate
    const uniq = routes.reduce((acc: any[], cur) => {
        if (!acc.find(a => a.method === cur.method && a.path === cur.path)) acc.push(cur);
        return acc;
    }, [] as any[]);

    return uniq;
};

app.get('/routes', (_req: Request, res: Response) => {
    return res.json({ routes: listRegisteredRoutes() });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Error: ${err.message} | Stack: ${err.stack}`);
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
