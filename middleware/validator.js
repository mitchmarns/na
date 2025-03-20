// middleware/validator.js
const { validationResult } = require('express-validator');

/**
 * Middleware to check for validation errors
 * Used with express-validator
 */
exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for better readability
    const formattedErrors = errors.array().reduce((acc, error) => {
      const field = error.path;
      if (!acc[field]) {
        acc[field] = [];
      }
      acc[field].push(error.msg);
      return acc;
    }, {});
    
    return res.status(400).json({
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  next();
};

/**
 * Helper to validate object IDs (for MongoDB)
 * Can be used with express-validator
 */
exports.isValidId = (value) => {
  // For MySQL, we just check if it's a positive integer
  const id = parseInt(value);
  if (isNaN(id) || id <= 0) {
    throw new Error('Invalid ID format');
  }
  return true;
};

/**
 * Custom validator to check if a field exists in the database
 * @param {string} table - Database table name
 * @param {string} field - Field name to check
 * @param {string} message - Error message
 * @returns {Function} - Express-validator custom validator function
 */
exports.existsInDb = (table, field, message) => {
  return async (value) => {
    const db = require('../config/db');
    const result = await db.queryOne(`SELECT 1 FROM ${table} WHERE ${field} = ?`, [value]);
    if (!result) {
      throw new Error(message || `${field} does not exist`);
    }
    return true;
  };
};

/**
 * Custom validator to check if a field is unique in the database
 * @param {string} table - Database table name
 * @param {string} field - Field name to check
 * @param {string} message - Error message
 * @param {string} exceptId - ID to exclude from the check (for updates)
 * @returns {Function} - Express-validator custom validator function
 */
exports.isUniqueInDb = (table, field, message, exceptId = null) => {
  return async (value, { req }) => {
    const db = require('../config/db');
    let query = `SELECT 1 FROM ${table} WHERE ${field} = ?`;
    let params = [value];
    
    // If exceptId is provided (from request), exclude that ID
    if (exceptId) {
      const id = req.params[exceptId] || req.body[exceptId];
      if (id) {
        query += ` AND id != ?`;
        params.push(id);
      }
    }
    
    const result = await db.queryOne(query, params);
    if (result) {
      throw new Error(message || `${field} already exists`);
    }
    return true;
  };
};