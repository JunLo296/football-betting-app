// backend/src/server.js
require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./config/database');

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

// Start the server
startServer();
