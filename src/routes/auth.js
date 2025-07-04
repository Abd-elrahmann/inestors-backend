const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  updateDetails
} = require('../controllers/auth');

// Import middlewares
const { protect, authorize } = require('../middlewares/auth');

// Routes
router.post('/register', register); // Allow public registration
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/updatedetails', protect, updateDetails);

module.exports = router; 