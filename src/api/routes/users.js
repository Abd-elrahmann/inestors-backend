const express = require('express');

const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} = require('../controllers/users');

const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Routes
router.route('/')
  .get(getAllUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.route('/:id/toggle-status')
  .put(toggleUserStatus);

module.exports = router; 