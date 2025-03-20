// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * Middleware to authenticate user using JWT
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from authorization header or cookie
    let token = null;
    
    // Check authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in header, check cookies
    if (!token && req.cookies) {
      token = req.cookies.token;
    }
    
    // If still no token, return unauthorized
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database (without password)
    const user = await db.queryOne(
      'SELECT id, username, email, role, created_at FROM Users WHERE id = ?',
      [decoded.userId]
    );
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Authentication error:', error.message);
    return res.status(500).json({ message: 'Server error during authentication' });
  }
};

/**
 * Check if user has admin role
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @param {boolean} rememberMe - Whether to extend token expiry
 * @returns {string} - JWT token
 */
const generateToken = (user, rememberMe = false) => {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role
  };
  
  const options = {
    expiresIn: rememberMe ? '30d' : JWT_EXPIRY
  };
  
  return jwt.sign(payload, JWT_SECRET, options);
};

/**
 * Set JWT token in HTTP-only cookie
 * @param {Object} res - Express response object
 * @param {string} token - JWT token
 * @param {boolean} rememberMe - Whether to extend cookie expiry
 */
const setTokenCookie = (res, token, rememberMe = false) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  };
  
  res.cookie('token', token, cookieOptions);
};

/**
 * Clear auth cookie
 * @param {Object} res - Express response object
 */
const clearAuthCookie = (res) => {
  res.clearCookie('token');
};

module.exports = {
  authenticate,
  isAdmin,
  generateToken,
  setTokenCookie,
  clearAuthCookie
};