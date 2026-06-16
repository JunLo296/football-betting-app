// backend/src/server.js
require('dotenv').config();
const app = require('./app');
const { initDatabase, runMigrations } = require('./config/database');
const cronService = require('./services/cronService');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Logger utility
 */
const logger = {
  info: (message, ...args) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args);
  }
};

/**
 * Start the server
 */
async function startServer() {
  try {
    logger.info('========================================');
    logger.info('Family Football Betting App');
    logger.info('========================================');
    logger.info(`Environment: ${NODE_ENV}`);
    logger.info(`Port: ${PORT}`);
    logger.info('');

    // Initialize database
    logger.info('Initializing database...');
    const db = await initDatabase();
    logger.info('✓ Database connected successfully');

    // Run migrations
    logger.info('Running database migrations...');
    await runMigrations(db);
    logger.info('✓ Database migrations completed successfully');

    // Start cron jobs
    logger.info('Starting cron jobs...');
    cronService.startCronJobs();
    logger.info('✓ Cron jobs started successfully');

    // Start Express server
    app.listen(PORT, () => {
      logger.info('');
      logger.info('========================================');
      logger.info(`✓ Server is running on port ${PORT}`);
      logger.info(`  Health check: http://localhost:${PORT}/api/health`);
      logger.info(`  API: http://localhost:${PORT}/api`);
      if (NODE_ENV === 'production') {
        logger.info(`  Frontend: http://localhost:${PORT}`);
      }
      logger.info('========================================');
      logger.info('');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  cronService.stopCronJobs();
  logger.info('✓ Cron jobs stopped');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  cronService.stopCronJobs();
  logger.info('✓ Cron jobs stopped');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
