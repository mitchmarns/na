// app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import database connection
const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const characterRoutes = require('./routes/characters');
const teamRoutes = require('./routes/teams');
const messageRoutes = require('./routes/messages');
const socialRoutes = require('./routes/social');
const gameRoutes = require('./routes/games');
const threadRoutes = require('./routes/threads');

// Import middleware
const errorHandler = require('./middleware/error');

// Create Express app
const app = express();

// Middleware
app.use(morgan('dev')); // Logging
app.use(helmet({ contentSecurityPolicy: false })); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', characterRoutes); // Includes /api/my-characters and /api/characters
app.use('/api/teams', teamRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/threads', threadRoutes);

// Add placeholder API endpoint for testing
app.get('/api/placeholder/:width/:height', (req, res) => {
  const { width, height } = req.params;
  res.redirect(`https://via.placeholder.com/${width}x${height}`);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbConnected = await db.testConnection();
    res.json({
      status: 'ok',
      timestamp: new Date(),
      dbConnection: dbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Handle 404 errors for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// For any other routes, serve the index.html file
// This allows client-side routing to work
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;