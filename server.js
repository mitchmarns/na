// server.js
const app = require('./app');
const db = require('./config/db');
require('dotenv').config();

// Set port from environment or use 3000 as default
const PORT = process.env.PORT || 3000;

// Start the server
async function startServer() {
  try {
    // Test database connection
    const connected = await db.testConnection();
    
    if (!connected) {
      console.error('WARNING: Unable to connect to the database. The application may not function correctly.');
    }
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`
══════════════════════════════════════════════════
  Northern Attitude Hockey Roleplay API Server
══════════════════════════════════════════════════
🚀 Server running on port ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
📁 API Documentation: http://localhost:${PORT}/api/docs
⚡ ${new Date().toLocaleString()}
══════════════════════════════════════════════════
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

// Start the server
startServer();