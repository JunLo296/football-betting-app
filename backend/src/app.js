// backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const betRoutes = require('./routes/bets');
const coinRoutes = require('./routes/coins');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const specialBetsRoutes = require('./routes/specialBets');
const setupRoutes = require('./routes/setup');
const worldcupRoutes = require('./routes/worldcup');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [REQUEST] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/special-bets', specialBetsRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/worldcup', worldcupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files in production
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// SPA fallback removed - use separate frontend dev server in development

// Global error handler
app.use((err, req, res, next) => {
  // Log error with timestamp
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${req.method} ${req.path}`);
  console.error(`[${timestamp}] [ERROR] Message: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${timestamp}] [ERROR] Stack:`, err.stack);
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON format in request body' });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Handle authentication errors
  if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  // Default error response
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
