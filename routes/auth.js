// routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validator');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', [
  // Validation
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validateRequest
], authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', [
  // Validation
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validateRequest
], authController.login);

/**
 * @route POST /api/auth/logout
 * @desc Logout a user
 * @access Public
 */
router.post('/logout', authController.logout);

/**
 * @route GET /api/auth/current-user
 * @desc Get current logged in user
 * @access Private
 */
router.get('/current-user', authenticate, authController.getCurrentUser);

/**
 * @route POST /api/auth/password-reset-request
 * @desc Request password reset (send email)
 * @access Public
 */
router.post('/password-reset-request', [
  // Validation
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  validateRequest
], authController.requestPasswordReset);

/**
 * @route POST /api/auth/password-reset
 * @desc Reset password with token
 * @access Public
 */
router.post('/password-reset', [
  // Validation
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  
  validateRequest
], authController.resetPassword);

module.exports = router;