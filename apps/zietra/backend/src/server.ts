import dotenv from 'dotenv';
import { app } from './app';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';

// Load environment variables with explicit path
const dotenvResult = dotenv.config({ path: '/home/ec2-user/crm-backend/backend/.env' });
console.log('🔧 Environment loaded:', dotenvResult.error ? dotenvResult.error.message : 'SUCCESS');
console.log('🔧 SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
console.log('🔧 SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      await prisma.$disconnect();
      logger.info('Database connection closed');
      
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      await prisma.$disconnect();
      logger.info('Database connection closed');
      
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();