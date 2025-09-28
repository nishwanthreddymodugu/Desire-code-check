import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Log folder
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Helper to get calling file name
const getFileName = (module: NodeJS.Module) => path.basename(module.filename);

// Create logger
const createLogger = (module: NodeJS.Module) => {
  const logFormat = winston.format.printf(({ level, message }) => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    return `[${timestamp}] [${getFileName(module)}] ${level.toUpperCase()}: ${message}`;
  });

  return winston.createLogger({
    level: 'debug',
    format: logFormat,
    transports: [
      // File transport with hourly rotation
      new winston.transports.DailyRotateFile({
        dirname: logDir,
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD-HH', // new log every hour
        maxFiles: '7d',               // keep logs for 7 days
      }),
      // Console transport
      new winston.transports.Console()
    ],
  });
};

export default createLogger;
