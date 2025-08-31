require('dotenv').config({ path: './config.env' });
const express = require('express');
const path = require('path');
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/api/v1/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Enhanced server is working!',
    time: new Date().toISOString()
  });
});

// Add simplified view routes
const simpleViewRouter = require('./server/routes/simpleViewRoutes');
app.use('/', simpleViewRouter);

// Add API routes one by one
const authRoutes = require('./server/routes/authRoutes');
app.use('/api/v1', authRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start the server
const port = process.env.PORT || 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Enhanced server running on port ${port}...`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔗 Test API at: http://localhost:' + port + '/api/v1/test');
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
