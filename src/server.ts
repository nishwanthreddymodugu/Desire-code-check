import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { sequelize } from './config/database';
import apiRoutes from './routes/routes'; 

const app: Application = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// All routes are now managed from the single imported router
app.use('/api/v1', apiRoutes);

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ message: 'An internal server error occurred', error: err.message });
});
    const startServer = async () => {
        try {
            await sequelize.authenticate();
            console.log('✅ Database connection established.');
    
            
            //await sequelize.sync({ force: true });
            await sequelize.sync({ alter: true });
            console.log('check---- synchronized.');
        
            app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
        } catch (error) {
            console.error('❌ Unable to start server:', error);
            process.exit(1);
        }
    };

startServer();

