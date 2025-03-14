const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const { initializeDatabase } = require('./db/database');

// Initialize database
initializeDatabase();

// Import routes
const indexRoutes = require('./routes/index');
const characterRoutes = require('./routes/characters');
const teamRoutes = require('./routes/teams');
const scenarioRoutes = require('./routes/scenarios');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'hockey-roleplay-hub-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Static files - make sure this comes BEFORE route definitions
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRoutes);
app.use('/characters', characterRoutes);
app.use('/teams', teamRoutes);
app.use('/scenarios', scenarioRoutes);
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { 
    title: '404 - Page Not Found', 
    user: req.session.user || null 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Server Error', 
    error: process.env.NODE_ENV === 'development' ? err : {}, 
    user: req.session.user || null 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;