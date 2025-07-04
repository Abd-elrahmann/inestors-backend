const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');

const {
  getInvestors,
  getInvestor,
  createInvestor,
  updateInvestor,
  deleteInvestor,
  getInvestorBalance,
  getInvestorTransactions,
  getInvestorProfits
} = require('../controllers/investors');

// Routes
router
  .route('/')
  .get(protect, getInvestors)
  .post(protect, authorize('admin'), createInvestor);

router
  .route('/:id')
  .get(protect, getInvestor)
  .put(protect, authorize('admin'), updateInvestor)
  .delete(protect, authorize('admin'), deleteInvestor);

router
  .route('/:id/balance')
  .get(protect, getInvestorBalance);

router
  .route('/:id/transactions')
  .get(protect, getInvestorTransactions);

router
  .route('/:id/profits')
  .get(protect, getInvestorProfits);

module.exports = router; 