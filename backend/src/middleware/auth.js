// backend/src/middleware/auth.js
const { verifyToken } = require('../services/authService');

/**
 * Authentication middleware to verify JWT token
 * Attaches user info to req.user if token is valid
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token and get user info
    const user = await verifyToken(token);

    // Attach user info to request object
    req.user = user;

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Handle other errors
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
