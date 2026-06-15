// backend/src/middleware/admin.js

/**
 * Admin authorization middleware
 * Must be used after authenticate middleware
 * Checks if the authenticated user is an admin
 */
function requireAdmin(req, res, next) {
  // Check if user is attached (should be added by authenticate middleware)
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Check if user is admin
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

module.exports = requireAdmin;
