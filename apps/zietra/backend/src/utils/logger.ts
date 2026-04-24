import winston from 'winston';
import path from 'path';

const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const logDir = isLambda ? '/tmp/logs' : 'logs';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const transports: winston.transport[] = [];

if (isLambda) {
  // Lambda: stdout only — CloudWatch captures it
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );
} else {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'crm-api' },
  transports,
});

if (!isLambda && process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ level, message, timestamp, stack }) => {
          if (stack) {
            return `${timestamp} [${level}]: ${message}\n${stack}`;
          }
          return `${timestamp} [${level}]: ${message}`;
        }),
      ),
    }),
  );
}

export { logger };
