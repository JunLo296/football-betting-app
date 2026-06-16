// backend/src/server.js
require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./config/database');
const cronService = require('./services/cronService');

const PORT = process.env.PORT || 3000;

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize database
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized successfully');

    // Start cron jobs
    console.log('Starting cron jobs...');
    cronService.startCronJobs();
    console.log('Cron jobs started successfully');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  cronService.stopCronJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  cronService.stopCronJobs();
  process.exit(0);
});

// Start the server
startServer();
