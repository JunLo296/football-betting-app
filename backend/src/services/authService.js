// backend/src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper functions to get JWT config at runtime (not at module load)
const getJwtSecret = () => process.env.JWT_SECRET || 'fallback-secret-key-for-development';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.username - Username
 * @param {string} userData.password - Plain text password
 * @param {string} userData.email - Email (optional)
 * @param {boolean} userData.is_admin - Admin flag (optional, defaults to false)
 * @returns {Promise<Object>} Created user info
 */
async function register({ username, password, email, is_admin = false }) {
  // Validate required fields
  if (!username) {
    throw new Error('Username is required');
  }
  if (!password) {
    throw new Error('Password is required');
  }

  // Validate field lengths
  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  // Check if username already exists
  const existingUser = await User.findByUsername(username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    username,
    password_hash,
    email: email || null,
    is_admin
  });

  // Remove password_hash from response (User.create doesn't include it, but being explicit)
  delete user.password_hash;

  return user;
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() });
}

/**
 * Login user with credentials
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Plain text password
 * @returns {Promise<Object>} Token and user info
 */
async function login({ username, password }) {
  // Validate required fields
  if (!username || !password) {
    throw new Error('Username and password are required');
  }

  // Find user
  const user = await User.findByUsername(username);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT token
  const token = generateToken({ userId: user.id, username: user.username });

  // Return token and user info (excluding password_hash)
  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      total_coins: user.total_coins
    }
  };
}

/**
 * Verify JWT token and return user
 * @param {string} token - JWT token
 * @returns {Promise<Object>} User info
 */
async function verifyToken(token) {
  // Validate token is provided
  if (!token) {
    throw new Error('Token is required');
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, getJwtSecret());

    // Find user by ID from token
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Return user info (excluding password_hash)
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      total_coins: user.total_coins
    };
  } catch (error) {
    // Re-throw with original message
    throw error;
  }
}

module.exports = {
  register,
  login,
  verifyToken,
  generateToken
};
