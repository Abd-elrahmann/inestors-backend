const express = require('express');
const router = express.Router();

const {
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword
} = require('../controllers/auth');

const { protect, authorize } = require('../middlewares/auth');

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);
router.put('/updatedetails', protect, updateDetails);

module.exports = router; 