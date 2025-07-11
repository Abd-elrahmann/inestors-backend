const express = require('express');
const router = express.Router();

const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  uploadTransactionAttachment,
  getTransactionAttachments,
  deleteTransactionAttachment
} = require('../controllers/transactions');

// Auth middleware
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Routes
router.route('/')
  .get(protect, getTransactions)
  .post(protect, authorize('admin'), createTransaction);

router.route('/:id')
  .get(protect, getTransaction)
  .put(protect, authorize('admin'), updateTransaction)
  .delete(protect, authorize('admin'), deleteTransaction);

router.route('/:transactionId/attachments')
  .get(protect, getTransactionAttachments)
  .post(protect, authorize('admin'), upload.single('attachment'), uploadTransactionAttachment);

router.route('/:transactionId/attachments/:attachmentId')
  .delete(protect, authorize('admin'), deleteTransactionAttachment);

module.exports = router; 