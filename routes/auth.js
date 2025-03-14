const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');

// GET /auth/register - Show registration form
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  
  res.render('auth/register', {
    title: 'Register - Hockey Roleplay Hub',
    errors: [],
    user: null
  });
});

// POST /auth/register - Process registration
router.post('/register', [
  // Validate input
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom(async (value) => {
      const db = getDb();
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(value);
      if (existingUser) {
        throw new Error('Username already in use');
      }
      return true;
    }),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .custom(async (value) => {
      const db = getDb();
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(value);
      if (existingUser) {
        throw new Error('Email already in use');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title: 'Register - Hockey Roleplay Hub',
      errors: errors.array(),
      formData: req.body,
      user: null
    });
  }
  
  try {
    const db = getDb();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    
    // Insert user into database
    const result = db.prepare(`
      INSERT INTO users (username, email, password)
      VALUES (?, ?, ?)
    `).run(req.body.username, req.body.email, hashedPassword);
    
    // Set session and redirect
    req.session.user = {
      id: result.lastInsertRowid,
      username: req.body.username,
      email: req.body.email
    };
    
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Registration Error',
      error: err,
      user: null
    });
  }
});

// GET /auth/login - Show login form
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  
  res.render('auth/login', {
    title: 'Login - Hockey Roleplay Hub',
    errors: [],
    redirect: req.query.redirect || '/',
    user: null
  });
});

// POST /auth/login - Process login
router.post('/login', [
  // Validate input
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title: 'Login - Hockey Roleplay Hub',
      errors: errors.array(),
      redirect: req.body.redirect || '/',
      user: null
    });
  }
  
  try {
    const db = getDb();
    
    // Find user by username
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.body.username);
    
    if (!user) {
      return res.render('auth/login', {
        title: 'Login - Hockey Roleplay Hub',
        errors: [{ msg: 'Invalid username or password' }],
        redirect: req.body.redirect || '/',
        user: null
      });
    }
    
    // Check password
    const passwordMatch = await bcrypt.compare(req.body.password, user.password);
    
    if (!passwordMatch) {
      return res.render('auth/login', {
        title: 'Login - Hockey Roleplay Hub',
        errors: [{ msg: 'Invalid username or password' }],
        redirect: req.body.redirect || '/',
        user: null
      });
    }
    
    // Set session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    
    // Redirect to requested page or home
    res.redirect(req.body.redirect || '/');
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'Login Error',
      error: err,
      user: null
    });
  }
});

// GET /auth/logout - Log out user
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;