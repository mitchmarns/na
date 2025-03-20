// middleware/error.js

/**
 * Global error handling middleware
 * Processes all errors and returns appropriate responses
 */
function errorHandler(err, req, res, next) {
  // Set default values
  const statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || null;
  
  // Log errors in development and production
  console.error(`[ERROR] ${req.method} ${req.path}:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    errors: err.errors
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Handle express-validator validation errors
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.errors
    });
  }
  
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Unauthorized: Token expired' });
  }
  
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate entry detected' });
  }
  
  // In production, don't send detailed error messages
  if (process.env.NODE_ENV === 'production') {
    // Keep validation errors but remove other error details
    if (!errors) {
      message = statusCode === 500 
        ? 'Internal server error' 
        : message;
    }
  }
  
  // Send the error response
  res.status(statusCode).json({
    message,
    errors,
    // Include stack trace in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;