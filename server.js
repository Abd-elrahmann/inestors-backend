const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

dotenv.config();

const investorRoutes = require('./src/api/routes/investors');
const transactionRoutes = require('./src/api/routes/transactions');
const authRoutes = require('./src/api/routes/auth');
const userRoutes = require('./src/api/routes/users');
const reportRoutes = require('./src/api/routes/reports');
const settingsRoutes = require('./src/api/routes/settings');
const financialYearRoutes = require('./src/api/routes/financialYears');
const notificationsRoutes = require('./src/api/routes/notifications');

const errorHandler = require('./src/api/middlewares/error');

const { startScheduler, stopScheduler } = require('./src/jobs/scheduler');

const app = express();

app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'src/api/uploads')));


app.use('/api/investors', investorRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/financial-years', financialYearRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Investors Management System API' });
});

app.use(errorHandler);

const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/investors-system';
    await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connected successfully to: ${MONGODB_URI}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    startScheduler();
  });
  

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

module.exports = app; 