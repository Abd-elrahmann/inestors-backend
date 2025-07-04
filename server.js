const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const investorRoutes = require('./src/routes/investors');
const transactionRoutes = require('./src/routes/transactions');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const reportRoutes = require('./src/routes/reports');
const settingsRoutes = require('./src/routes/settings');
const financialYearRoutes = require('./src/routes/financialYears');
const notificationsRoutes = require('./src/routes/notifications');

// Import error handler
const errorHandler = require('./src/middlewares/error');

// Import scheduler
const { startScheduler, stopScheduler } = require('./src/utils/scheduler');

// Initialize express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('dev')); // Logging
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));


// API Routes
app.use('/api/investors', investorRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/financial-years', financialYearRoutes);
app.use('/api/notifications', notificationsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Investors Management System API' });
});

// Error handling middleware
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    // Use the correct database name
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/investors-system';
    await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connected successfully to: ${MONGODB_URI}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Start scheduler after server starts
    startScheduler();
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    stopScheduler();
    server.close(() => {
      console.log('Process terminated');
    });
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    stopScheduler();
    server.close(() => {
      console.log('Process terminated');
    });
  });
});

module.exports = app; // For testing purposes 