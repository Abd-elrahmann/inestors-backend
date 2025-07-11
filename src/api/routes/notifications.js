const express = require('express');

const {
  getNotifications,
  getNotification,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  getNotificationStats,
  createNotification,
  broadcastNotification
} = require('../controllers/notifications');

// Load auth middleware
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/notifications - Get all notifications for current user
router.get('/', getNotifications);

// GET /api/notifications/stats - Get notification statistics
router.get('/stats', getNotificationStats);

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', markAllAsRead);

// POST /api/notifications - Create notification (Admin only)
router.post('/', authorize('admin'), createNotification);

// POST /api/notifications/broadcast - Broadcast notification to all users (Admin only)
router.post('/broadcast', authorize('admin'), broadcastNotification);

// GET /api/notifications/:id - Get notification by ID
router.get('/:id', getNotification);

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', markAsRead);

// PUT /api/notifications/:id/archive - Archive notification
router.put('/:id/archive', archiveNotification);

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', deleteNotification);

module.exports = router; 