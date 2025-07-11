const express = require('express');
const router = express.Router();

const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword
} = require('../controllers/auth');

// Auth middleware
const { protect, authorize } = require('../middlewares/auth');

// Routes
router.post('/register', register); // Allow public registration
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/updatedetails', protect, updateDetails);

module.exports = router; 