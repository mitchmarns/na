// controllers/auth.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateToken, setTokenCookie, clearAuthCookie } = require('../middleware/auth');

// Salt rounds for password hashing
const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @route POST /api/auth/register
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Validate input
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    // Check if email already exists
    const emailExists = await db.queryOne(
      'SELECT id FROM Users WHERE email = ?',
      [email]
    );
    
    if (emailExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    // Check if username already exists
    const usernameExists = await db.queryOne(
      'SELECT id FROM Users WHERE username = ?',
      [username]
    );
    
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Insert user into database
    const userId = await db.insert('Users', {
      username,
      email,
      password_hash: passwordHash,
      role: 'user',
      created_at: new Date()
    });
    
    // Create default user settings
    await db.insert('UserSettings', {
      user_id: userId,
      privacy_settings: JSON.stringify({
        visibility: 'public',
        preferences: ['email', 'messages', 'games']
      }),
      created_at: new Date()
    });
    
    res.status(201).json({ 
      message: 'Registration successful',
      userId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in a user
 * @route POST /api/auth/login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Get user by email
    const user = await db.queryOne(
      'SELECT id, username, email, password_hash, role FROM Users WHERE email = ?',
      [email]
    );
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Update last login timestamp
    await db.update('Users', 
      { last_login: new Date() },
      { id: user.id }
    );
    
    // Generate JWT token
    const token = generateToken(user, rememberMe);
    
    // Set cookie
    setTokenCookie(res, token, rememberMe);
    
    // Return user data (excluding password)
    const { password_hash, ...userData } = user;
    
    res.status(200).json({
      message: 'Login successful',
      user: userData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out a user
 * @route POST /api/auth/logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logout = (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ message: 'Logout successful' });
};

/**
 * Get current user info
 * @route GET /api/auth/current-user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCurrentUser = (req, res) => {
  res.status(200).json({ 
    authenticated: true,
    user: req.user 
  });
};

/**
 * Request password reset
 * @route POST /api/auth/password-reset-request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Check if user exists
    const user = await db.queryOne(
      'SELECT id, username FROM Users WHERE email = ?',
      [email]
    );
    
    // Don't reveal whether the email exists
    const responseData = {
      message: 'If your email is registered, you will receive reset instructions'
    };
    
    if (user) {
      // Generate reset token
      const resetToken = uuidv4();
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 1); // 1 hour expiry
      
      // Store reset token in database
      await db.insert('PasswordResets', {
        user_id: user.id,
        token: resetToken,
        expires_at: expiryDate,
        used: false,
        created_at: new Date()
      });
      
      // In a real app, send email with reset link
      console.log(`Password reset link for ${user.username}: /reset-password?token=${resetToken}`);
      
      // For development, return token in response
      if (process.env.NODE_ENV === 'development') {
        responseData.dev_token = resetToken;
      }
    }
    
    res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * @route POST /api/auth/password-reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    // Get valid reset token
    const resetRequest = await db.queryOne(
      `SELECT user_id FROM PasswordResets 
       WHERE token = ? AND expires_at > NOW() AND used = 0`,
      [token]
    );
    
    if (!resetRequest) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // Update user password
    await db.update('Users',
      { password_hash: passwordHash },
      { id: resetRequest.user_id }
    );
    
    // Mark token as used
    await db.update('PasswordResets',
      { used: true },
      { token }
    );
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};