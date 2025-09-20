import { createLogger, format, transports } from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

const logger = createLogger({
  level: 'info', // Default log level
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Log stack trace
    logFormat
  ),
  transports: [
    // Console output (colorized)
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),
    // Log all info and above to combined.log
    new transports.File({ filename: path.join(__dirname, '..', 'logs', 'combined.log') }),
    // Log errors separately
    new transports.File({ filename: path.join(__dirname, '..', 'logs', 'error.log'), level: 'error' }),
  ],
  exitOnError: false,
});

export default logger;
